/**
 * 시작 화면 컴포넌트
 */

import { useState } from 'react';
import BattleDialog from '../components/BattleDialog';
import { createGuestPlayer, startBattleRoom } from '../services/battleApi';
import './StartPage.css';

function StartPage({ onNavigateBattle }) {
  const [showBattleDialog, setShowBattleDialog] = useState(false);
  const [isBattleLoading, setIsBattleLoading] = useState(false);
  const [battleError, setBattleError] = useState(null);

  const handlePractice = () => {
    // TODO: 연습하기 기능 구현
    console.log('연습하기');
  };

  const handleBattle = async () => {
    if (isBattleLoading) return;

    console.debug('[StartPage] 배틀하기 클릭');
    setIsBattleLoading(true);
    setBattleError(null);

    try {
      console.debug('[StartPage] 게스트 생성 요청');
      await createGuestPlayer();
      console.debug('[StartPage] 게스트 생성 성공');
      setShowBattleDialog(true);
    } catch (error) {
      console.error('게스트 생성 실패:', error);
      setBattleError('배틀 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsBattleLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setShowBattleDialog(false);
  };

  const handleStartBattle = async ({ sessionId, roomCode }) => {
    if (!sessionId) return false;
    try {
      console.log('[StartPage] 배틀 시작 요청', { sessionId });
      const response = await startBattleRoom(sessionId, { countdownSec: 3 });
      console.log('[StartPage] 배틀 시작 API 성공', { sessionId, roomCode, response });
      return true;
    } catch (error) {
      console.log('[StartPage] 배틀 시작 API 실패', error);
      return false;
    }
  };

  const handleCountdownComplete = ({ sessionId, roomCode }) => {
    setShowBattleDialog(false);
    if (onNavigateBattle) {
      onNavigateBattle({ sessionId, roomCode, role: 'host' });
    }
  };

  return (
    <>
      <div className="start-page">
        <div className="start-page__container">
          <h1 className="start-page__title">문법 배틀</h1>
          <div className="start-page__buttons">
            <button 
              className="start-page__button start-page__button--practice"
              onClick={handlePractice}
            >
              연습하기
            </button>
            <button 
              className="start-page__button start-page__button--battle"
              onClick={handleBattle}
              disabled={isBattleLoading}
            >
              {isBattleLoading ? '준비 중...' : '배틀하기'}
            </button>
          </div>
          {battleError && <p className="start-page__error">{battleError}</p>}
        </div>
      </div>
      {showBattleDialog && (
        <BattleDialog 
          onClose={handleCloseDialog}
          onStart={handleStartBattle}
          onCountdownComplete={handleCountdownComplete}
        />
      )}
    </>
  );
}

export default StartPage;

