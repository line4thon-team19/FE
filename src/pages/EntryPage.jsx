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
      const trimmed = roomCode.trim();
      console.log('[EntryPage] roomCode prop 사용', trimmed);
      return trimmed;
    }
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/join\/([A-Za-z0-9]+)/);
      if (match && match[1]) {
        console.log('[EntryPage] pathname에서 roomCode 파싱', { pathname, roomCode: match[1] });
        return match[1];
      }
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('roomCode');
      if (fromQuery) {
        console.log('[EntryPage] searchParams에서 roomCode 파싱', { fromQuery });
        return fromQuery;
      }
    }
    console.warn('[EntryPage] roomCode를 찾지 못했습니다.', { roomCode, sessionId });
    return null;
  }, [roomCode, sessionId]);

  useEffect(() => {
    if (!resolvedRoomCode) {
      console.warn('[EntryPage] roomCode가 없습니다. 링크 파싱 대기', { roomCode, resolvedRoomCode });
      return;
    }

    setError(null);

    const ensureGuestToken = async () => {
      try {
        setIsLoading(true);
        console.log('[EntryPage] 게스트 토큰 재발급 요청');
        await createGuestPlayer();
        setTokenReady(true);
        console.log('[EntryPage] 게스트 토큰 준비 완료');
      } catch (err) {
        console.error('게스트 토큰 발급 실패:', err);
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
        console.log('[EntryPage] enterBattleRoom 요청 시작', { roomCode: resolvedRoomCode });
        const entry = await enterBattleRoom(resolvedRoomCode);
        console.log('[EntryPage] enterBattleRoom 응답', entry);
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
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('배틀룸 입장 실패:', err);
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

