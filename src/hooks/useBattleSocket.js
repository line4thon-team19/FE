import { useCallback, useEffect, useRef, useState } from 'react';
import { connectBattleSocket } from '../services/socket';

const initialRoundInfo = { current: 0, total: 0 };
const JOIN_INITIAL_DELAY_MS = 300;
const JOIN_RETRY_DELAY_MS = 400;
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

export function useBattleSocket({ sessionId, roomCode }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [roundInfo, setRoundInfo] = useState(initialRoundInfo);
  const [remainingSec, setRemainingSec] = useState(null);
  const [question, setQuestion] = useState(null);
  const [typingSnapshot, setTypingSnapshot] = useState(null);
  const [answerJudged, setAnswerJudged] = useState(null);
  const [summary, setSummary] = useState(null);
  const myPlayerIdRef = useRef(ensurePlayerId());

  useEffect(() => {
    console.debug('[useBattleSocket] effect mount', { sessionId, roomCode });
    if (!sessionId) {
      console.debug('[useBattleSocket] sessionId 없음, 초기화만 수행');
      return;
    }
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('guestToken') : null;
    if (!token) {
      console.warn('[useBattleSocket] guestToken 없음, 소켓 연결 건너뜀', { sessionId, roomCode });
      return;
    }

    console.debug('[useBattleSocket] connecting', { sessionId, roomCode, token, playerId: myPlayerIdRef.current });
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
          console.debug('[BattleSocket] battle:join ack playerId 갱신', { old: myPlayerIdRef.current, next: myId });
          myPlayerIdRef.current = myId;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('guestPlayerId', myId);
          }
        }
        return true;
      }
      console.error('[BattleSocket] battle:join 실패', { ack, sessionId, roomCode });
      return false;
    };

    const scheduleJoinAttempt = (attemptIndex) => {
      const payload = { sessionId, ...(roomCode ? { roomCode } : {}), playerId: myPlayerIdRef.current };
      clearJoinRetryTimeout();
      joinRetryTimeoutId = setTimeout(() => {
        if (!socket.connected) {
          console.warn('[BattleSocket] battle:join 시도 전 소켓 연결이 끊김', { sessionId, roomCode, attemptIndex });
          return;
        }
        console.debug('[BattleSocket] battle:join 시도', { payload, attempt: attemptIndex + 1, sessionId, roomCode });
        socket.emit('battle:join', payload, (ack) => {
          console.debug('[BattleSocket] battle:join ack', { ack, sessionId, roomCode, attempt: attemptIndex + 1 });
          if (processJoinAck(ack)) {
            clearJoinRetryTimeout();
            return;
          }
          if (attemptIndex + 1 < JOIN_MAX_ATTEMPTS) {
            console.warn('[BattleSocket] battle:join 실패, 재시도 예정', {
              attempt: attemptIndex + 1,
              sessionId,
              roomCode,
            });
            scheduleJoinAttempt(attemptIndex + 1);
          } else {
            console.error('[BattleSocket] battle:join 재시도 한도 초과', { sessionId, roomCode });
          }
        });
      }, attemptIndex === 0 ? JOIN_INITIAL_DELAY_MS : JOIN_RETRY_DELAY_MS);
    };

    socket.on('connect', () => {
      console.debug('[BattleSocket] connected', { socketId: socket.id, sessionId, roomCode });
      setConnected(true);
      scheduleJoinAttempt(0);
    });

    socket.on('connect_error', (err) => {
      console.error('[BattleSocket] connect_error', err, { sessionId, roomCode });
    });

    socket.on('disconnect', (reason) => {
      console.debug('[BattleSocket] disconnected', { reason, sessionId, roomCode });
      clearJoinRetryTimeout();
      setConnected(false);
    });

    socket.on('battle:player_joined', (payload = {}) => {
      console.debug('[BattleSocket] battle:player_joined', { payload, sessionId, roomCode });
      const myId = myPlayerIdRef.current;
      if (payload.playerId && payload.playerId !== myId) {
        setRemoteJoined(true);
      }
    });

    socket.on('battle:snapshot', (payload = {}) => {
      console.debug('[BattleSocket] battle:snapshot', { payload, sessionId, roomCode });
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
      console.debug('[BattleSocket] battle:typing:update', { payload, sessionId, roomCode });
      setTypingSnapshot(payload);
      const myId = myPlayerIdRef.current;
      if (payload.playerId && payload.playerId !== myId) {
        setRemoteJoined(true);
      }
    });

    socket.on('battle:round:next', (payload = {}) => {
      console.debug('[BattleSocket] battle:round:next', { payload, sessionId, roomCode });
      if (payload.round) {
        setRoundInfo(payload.round);
      }
      if (typeof payload.remainingSec === 'number') {
        setRemainingSec(payload.remainingSec);
      }
      setQuestion(null);
    });

    socket.on('battle:round:ticker', (payload = {}) => {
      console.debug('[BattleSocket] battle:round:ticker', { payload, sessionId, roomCode });
      if (typeof payload.remainingSec === 'number') {
        setRemainingSec(payload.remainingSec);
      }
      if (payload.round) {
        setRoundInfo(payload.round);
      }
    });

    socket.on('battle:round:end', (payload = {}) => {
      console.debug('[BattleSocket] battle:round:end', { payload, sessionId, roomCode });
      setRemainingSec(0);
      if (payload.state === 'ENDED') {
        setRemoteJoined(false);
      }
    });

    socket.on('battle:answer:result', (payload = {}) => {
      console.debug('[BattleSocket] battle:answer:result', { payload, sessionId, roomCode });
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

    return () => {
      console.debug('[useBattleSocket] cleanup', { sessionId, roomCode });
      clearJoinRetryTimeout();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setRemoteJoined(false);
      setTypingSnapshot(null);
      setAnswerJudged(null);
      setQuestion(null);
      setRoundInfo(initialRoundInfo);
      setRemainingSec(null);
      setSummary(null);
    };
  }, [sessionId, roomCode]);

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
    sendTypingSnapshot,
    submitAnswer,
    playerId: myPlayerIdRef.current,
  };
}
