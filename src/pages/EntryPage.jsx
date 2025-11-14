/**
 * 배틀룸 입장 페이지 컴포넌트
 */

import { useState, useEffect, useMemo } from 'react';
import { createGuestPlayer, enterBattleRoom } from '../services/battleApi';
import { useBattleSocket } from '../hooks/useBattleSocket';
import './EntryPage.css';

function EntryPage({ roomCode, sessionId, onBack, onReady }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [navigated, setNavigated] = useState(false);
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionId ?? null);
  const [entrySnapshot, setEntrySnapshot] = useState(null);

  const resolvedRoomCode = useMemo(() => {
    if (roomCode && roomCode.trim().length > 0) {
      return roomCode.trim();
    }
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/join\/([A-Za-z0-9]+)/);
      if (match && match[1]) {
        return match[1];
      }
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('roomCode');
      if (fromQuery) {
        return fromQuery;
      }
    }
    return null;
  }, [roomCode, sessionId]);

  useEffect(() => {
    if (!resolvedRoomCode) {
      return;
    }

    setError(null);

    const ensureGuestToken = async () => {
      try {
        setIsLoading(true);
        await createGuestPlayer();
        setTokenReady(true);
      } catch (err) {
        setError('게스트 토큰 발급에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    ensureGuestToken();
  }, [resolvedRoomCode, roomCode]);

  useEffect(() => {
    if (!tokenReady) return;
    if (error) return;
    if (!resolvedRoomCode) return;

    let cancelled = false;

    const fetchEntry = async () => {
      try {
        setIsLoading(true);
        const entry = await enterBattleRoom(resolvedRoomCode);
        if (cancelled) return;
        setEntrySnapshot(entry);
        const entrySessionId =
          entry?.sessionId ??
          entry?.session_id ??
          entry?.room?.sessionId ??
          entry?.room?.session_id ??
          null;
        if (!entrySessionId) {
          throw new Error('세션 정보를 찾을 수 없습니다.');
        }
        setResolvedSessionId(entrySessionId);
        
        // 게스트 입장 시 questions가 있으면 sessionStorage에 저장 (TTS용)
        // 여러 경로에서 questions 찾기
        const questions =
          entry?.questions ??
          entry?.room?.questions ??
          entry?.data?.questions ??
          null;
        if (entrySessionId && questions && Array.isArray(questions) && questions.length > 0) {
          try {
            sessionStorage.setItem(
              `battleQuestions:${entrySessionId}`,
              JSON.stringify(questions),
            );
          } catch (storageError) {
            // battleQuestions 저장 실패
          }
        }
        
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || '배틀룸 입장에 실패했습니다.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchEntry();

    return () => {
      cancelled = true;
    };
  }, [tokenReady, resolvedRoomCode, error]);

  const { connected, question, remainingSec } = useBattleSocket(
    !tokenReady || error || !resolvedSessionId || !resolvedRoomCode
      ? { sessionId: null, roomCode: null }
      : { sessionId: resolvedSessionId, roomCode: resolvedRoomCode },
  );

  const countdownDisplay = useMemo(() => {
    if (question) return null;
    if (typeof remainingSec !== 'number') return null;
    if (remainingSec <= 0) return null;
    if (remainingSec > 60) return null;
    return remainingSec;
  }, [remainingSec, question]);

  useEffect(() => {
    if (tokenReady && connected) {
      setIsLoading(false);
    }
  }, [tokenReady, connected]);

  const countdownActive = countdownDisplay !== null;

  useEffect(() => {
    if (navigated) return;
    if (!onReady) return;
    if (!resolvedSessionId || !resolvedRoomCode) return;
    if (!question && !countdownActive) return;
    setNavigated(true);
    onReady({ sessionId: resolvedSessionId, roomCode: resolvedRoomCode, entry: entrySnapshot });
  }, [
    navigated,
    question,
    countdownActive,
    onReady,
    resolvedSessionId,
    resolvedRoomCode,
    entrySnapshot,
  ]);

  if (isLoading) {
    return (
      <div className="entry-page">
        <div className="entry-page__container">
          <div className="entry-page__loading">배틀룸에 입장하는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="entry-page">
        <div className="entry-page__container">
          <div className="entry-page__error">{error}</div>
          <button className="entry-page__back-button" onClick={onBack}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="entry-page">
      <div className="entry-page__container">
        <h1 className="entry-page__title">배틀룸에 입장했습니다!</h1>
        {resolvedRoomCode && <p className="entry-page__room-code">방 코드: {resolvedRoomCode}</p>}
        <p className="entry-page__waiting">호스트가 게임을 시작할 때까지 기다려주세요...</p>
        {countdownDisplay !== null && (
          <div className="entry-page__countdown" role="status" aria-live="assertive">
            {countdownDisplay}초 후 게임이 시작됩니다!
          </div>
        )}
      </div>
    </div>
  );
}

export default EntryPage;

