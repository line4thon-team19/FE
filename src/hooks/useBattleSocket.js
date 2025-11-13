import { useCallback, useEffect, useRef, useState } from 'react';
import { connectBattleSocket } from '../services/socket';

const initialRoundInfo = { current: 0, total: 0 };
const DEFAULT_JOIN_INITIAL_DELAY_MS = 300;
const DEFAULT_JOIN_RETRY_DELAY_MS = 400;
const JOIN_MAX_ATTEMPTS = 3;

function ensurePlayerId() {
  if (typeof window === 'undefined') return null;
  let stored = sessionStorage.getItem('guestPlayerId');
  if (!stored || stored.trim().length === 0) {
    stored = `plr_${Math.random().toString(36).slice(-6)}`;
    sessionStorage.setItem('guestPlayerId', stored);
  }
  return stored;
}

export function useBattleSocket({
  sessionId,
  roomCode,
  connectDelayMs = 0,
  joinInitialDelayMs = DEFAULT_JOIN_INITIAL_DELAY_MS,
  joinRetryDelayMs = DEFAULT_JOIN_RETRY_DELAY_MS,
  shouldJoin = true,
}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [roundInfo, setRoundInfo] = useState(initialRoundInfo);
  const [remainingSec, setRemainingSec] = useState(null);
  const [question, setQuestion] = useState(null);
  const [typingSnapshot, setTypingSnapshot] = useState(null);
  const [answerJudged, setAnswerJudged] = useState(null);
  const [summary, setSummary] = useState(null);
  const [lastRoundEndEvent, setLastRoundEndEvent] = useState(null);
  const myPlayerIdRef = useRef(ensurePlayerId());
  const typingCacheRef = useRef({});

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('guestToken') : null;

    let connectTimeoutId = null;
    let socketCleanup = null;

    const setupSocket = () => {
      const socket = connectBattleSocket(sessionId, token, myPlayerIdRef.current);
      socketRef.current = socket;
      let joinRetryTimeoutId = null;

      const clearJoinRetryTimeout = () => {
        if (joinRetryTimeoutId) {
          clearTimeout(joinRetryTimeoutId);
          joinRetryTimeoutId = null;
        }
      };

      const processJoinAck = (ack) => {
        if (ack?.ok) {
          const myId = ack?.you?.playerId ?? ack?.playerId ?? myPlayerIdRef.current;
          if (myId && myId !== myPlayerIdRef.current) {
            myPlayerIdRef.current = myId;
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('guestPlayerId', myId);
            }
          }
          return true;
        }
        return false;
      };

      const scheduleJoinAttempt = (attemptIndex) => {
        const payload = { sessionId, ...(roomCode ? { roomCode } : {}), playerId: myPlayerIdRef.current };
        clearJoinRetryTimeout();
        joinRetryTimeoutId = setTimeout(() => {
          if (!socket.connected) {
            return;
          }
          socket.emit('battle:join', payload, (ack) => {
            if (processJoinAck(ack)) {
              clearJoinRetryTimeout();
              return;
            }
            if (attemptIndex + 1 < JOIN_MAX_ATTEMPTS) {
              scheduleJoinAttempt(attemptIndex + 1);
            } else {
            }
          });
        }, attemptIndex === 0 ? joinInitialDelayMs : joinRetryDelayMs);
      };

      socket.on('connect', () => {
        setConnected(true);
        if (shouldJoin) {
          scheduleJoinAttempt(0);
        } else {
        }
      });

      socket.on('connect_error', (err) => {
      });

      socket.on('disconnect', (reason) => {
        clearJoinRetryTimeout();
        setConnected(false);
      });

      socket.on('battle:player_joined', (payload = {}) => {
        const myId = myPlayerIdRef.current;
        if (payload.playerId && payload.playerId !== myId) {
          setRemoteJoined(true);
        }
      });

      socket.on('battle:snapshot', (payload = {}) => {
        setQuestion(payload.question ?? null);
        if (payload.round) {
          setRoundInfo(payload.round);
        }
        if (typeof payload.remainingTime === 'number') {
          setRemainingSec(payload.remainingTime);
        }
        if (payload.summary) {
          setSummary(payload.summary);
        }
      });

      socket.on('battle:typing:update', (payload = {}) => {
        setTypingSnapshot(payload);
        if (payload.playerId) {
          typingCacheRef.current[payload.playerId] = {
            preview: typeof payload.preview === 'string' ? payload.preview : '',
            text: typeof payload.text === 'string' ? payload.text : '',
            ts: payload.ts ?? Date.now(),
          };
        }
        const myId = myPlayerIdRef.current;
        if (payload.playerId && payload.playerId !== myId) {
          setRemoteJoined(true);
        }
      });

      socket.on('battle:round:next', (payload = {}) => {
        if (payload.round) {
          setRoundInfo(payload.round);
        }
        if (typeof payload.remainingSec === 'number') {
          setRemainingSec(payload.remainingSec);
        }
        setQuestion(null);
      });

      socket.on('battle:round:ticker', (payload = {}) => {
        if (typeof payload.remainingSec === 'number') {
          setRemainingSec(payload.remainingSec);
        }
        if (payload.round) {
          setRoundInfo(payload.round);
        }
      });

      socket.on('battle:round:end', (payload = {}) => {
        console.log('[BattleSocket] battle:round:end', { payload, sessionId, roomCode });
        setRemainingSec(0);
        if (payload.round) {
          setRoundInfo(payload.round);
        }
        setLastRoundEndEvent({
          round: payload?.round?.current ?? payload?.round ?? null,
          total: payload?.round?.total ?? null,
          state: payload?.state ?? null,
          ts: Date.now(),
        });
        if (payload.state === 'ENDED') {
          setRemoteJoined(false);
        }
      });

      socket.on('battle:answer:result', (payload = {}) => {
        console.log('[BattleSocket] battle:answer:result', { payload, sessionId, roomCode });
      if (payload?.playerId) {
        const cacheEntry = typingCacheRef.current[payload.playerId];
        if (cacheEntry) {
          const latestText = cacheEntry.text || cacheEntry.preview;
          if (latestText && latestText.trim().length > 0) {
            payload.submittedText = latestText.trim();
          }
          delete typingCacheRef.current[payload.playerId];
        }
      }
        setAnswerJudged(payload);
        if (payload.summary) {
          setSummary(payload.summary);
        }
        const myId = myPlayerIdRef.current;
        if (payload.playerId && payload.playerId !== myId) {
          setRemoteJoined(true);
        }
      });

      socket.on('error', (err) => {
        console.error('[BattleSocket] error', err, { sessionId, roomCode });
      });

      socketCleanup = () => {
        console.log('[useBattleSocket] cleanup socket', { sessionId, roomCode });
        clearJoinRetryTimeout();
        socket.removeAllListeners();
        socket.disconnect();
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
      };
    };

    connectTimeoutId = setTimeout(setupSocket, Math.max(0, connectDelayMs));

    return () => {
      console.debug('[useBattleSocket] cleanup', { sessionId, roomCode });
      if (connectTimeoutId) {
        clearTimeout(connectTimeoutId);
      }
      if (socketCleanup) {
        socketCleanup();
      } else if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setRemoteJoined(false);
      setTypingSnapshot(null);
      setAnswerJudged(null);
      setQuestion(null);
      setRoundInfo(initialRoundInfo);
      setRemainingSec(null);
      setSummary(null);
      setLastRoundEndEvent(null);
    };
  }, [sessionId, roomCode, connectDelayMs, joinInitialDelayMs, joinRetryDelayMs, shouldJoin]);

  const sendTypingSnapshot = useCallback(
    ({ round, text, cursor }) => {
      if (!socketRef.current || !sessionId) return;
      const payload = {
        sessionId,
        ...(roomCode ? { roomCode } : {}),
        round,
        text,
        ...(typeof cursor === 'number' ? { cursor } : {}),
      };
      console.debug('[BattleSocket] send battle:typing', payload);
      socketRef.current.emit('battle:typing', payload);
      setTypingSnapshot({ ...payload, playerId: myPlayerIdRef.current });
    },
    [sessionId, roomCode],
  );

  const submitAnswer = useCallback(
    ({ round, answerText }) => {
      if (!socketRef.current || !sessionId) {
        return Promise.reject(new Error('소켓 연결이 없습니다.'));
      }
      const payload = { sessionId, ...(roomCode ? { roomCode } : {}), round, answerText };
      console.debug('[BattleSocket] send battle:answer:submit', payload);
      return new Promise((resolve, reject) => {
        socketRef.current.emit('battle:answer:submit', payload, (ack) => {
          console.debug('[BattleSocket] battle:answer:submit ack', { ack, sessionId, roomCode });
          if (ack?.ok) {
            resolve(ack);
          } else {
            reject(new Error(ack?.message || '정답 제출 실패'));
          }
        });
      });
    },
    [sessionId, roomCode],
  );

  return {
    connected,
    remoteJoined,
    roundInfo,
    remainingSec,
    question,
    typingSnapshot,
    answerJudged,
    summary,
    roundEndEvent: lastRoundEndEvent,
    sendTypingSnapshot,
    submitAnswer,
    playerId: myPlayerIdRef.current,
  };
}
