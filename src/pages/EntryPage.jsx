/**
 * 배틀룸 입장 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { entryBattleRoom } from '../services/battleApi';
import './EntryPage.css';

function EntryPage({ roomCode, onBack }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entryData, setEntryData] = useState(null);

  useEffect(() => {
    const enterRoom = async () => {
      if (!roomCode) {
        setError('방 코드가 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await entryBattleRoom({ roomCode });
        setEntryData(response);
      } catch (err) {
        console.error('배틀룸 입장 실패:', err);
        setError('배틀룸 입장에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    enterRoom();
  }, [roomCode]);

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
        <p className="entry-page__room-code">방 코드: {entryData?.roomCode}</p>
        <p className="entry-page__waiting">호스트가 게임을 시작할 때까지 기다려주세요...</p>
        <div className="entry-page__players">
          <p>현재 플레이어: {entryData?.players?.length || 0}명</p>
        </div>
      </div>
    </div>
  );
}

export default EntryPage;

