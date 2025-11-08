/**
 * 배틀룸 입장 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { createGuestPlayer } from '../services/battleApi';
import { useBattleSocket } from '../hooks/useBattleSocket';
import './EntryPage.css';

function EntryPage({ roomCode, sessionId, onBack, onReady }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('유효하지 않은 초대 링크입니다.');
      setIsLoading(false);
      return;
    }

    const ensureGuestToken = async () => {
      try {
        setIsLoading(true);
        console.debug('[EntryPage] 게스트 토큰 재발급 요청');
        await createGuestPlayer();
        setTokenReady(true);
      } catch (err) {
        console.error('게스트 토큰 발급 실패:', err);
        setError('게스트 토큰 발급에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    ensureGuestToken();
  }, [sessionId]);

  const { connected, question } = useBattleSocket(
    !tokenReady || error ? { sessionId: null, roomCode: null } : { sessionId, roomCode },
  );

  useEffect(() => {
    if (tokenReady && connected) {
      setIsLoading(false);
    }
  }, [tokenReady, connected]);

  useEffect(() => {
    if (navigated) return;
    if (!question) return;
    if (!onReady) return;
    setNavigated(true);
    onReady({ sessionId, roomCode });
  }, [navigated, question, onReady, sessionId, roomCode]);

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
        {roomCode && <p className="entry-page__room-code">방 코드: {roomCode}</p>}
        <p className="entry-page__waiting">호스트가 게임을 시작할 때까지 기다려주세요...</p>
      </div>
    </div>
  );
}

export default EntryPage;

