/**
 * 시작 화면 컴포넌트
 */

import { useState } from 'react';
import BattleDialog from '../components/BattleDialog';
import './StartPage.css';

function StartPage() {
  const [showBattleDialog, setShowBattleDialog] = useState(false);

  const handlePractice = () => {
    // TODO: 연습하기 기능 구현
    console.log('연습하기');
  };

  const handleBattle = () => {
    setShowBattleDialog(true);
  };

  const handleCloseDialog = () => {
    setShowBattleDialog(false);
  };

  const handleStartBattle = (sessionId) => {
    // TODO: 배틀 시작 로직 구현
    console.log('배틀 시작:', sessionId);
    setShowBattleDialog(false);
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
            >
              배틀하기
            </button>
          </div>
        </div>
      </div>
      {showBattleDialog && (
        <BattleDialog 
          onClose={handleCloseDialog}
          onStart={handleStartBattle}
        />
      )}
    </>
  );
}

export default StartPage;

