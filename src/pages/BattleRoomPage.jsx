import { useEffect, useMemo, useState } from 'react';
import { useBattleSocket } from '../hooks/useBattleSocket';
import winLion from '../assets/win_lion.svg';
import cryLion from '../assets/cry_lion.svg';
import timerIcon from '../assets/timer.svg';
import './BattleRoomPage.css';

function deriveAnswerEntry(source = {}) {
  if (!source) return { text: '', isCorrect: false };  
  const text = source.answer ?? source.text ?? source.content ?? '';
  const isCorrect = Boolean(source.isCorrect ?? source.correct ?? source.result === 'CORRECT');
  return { text, isCorrect };
}

const MAX_BADGES = 5;

function BattleRoomPage({ sessionId, roomCode, role = 'guest' }) {
  const [inputValue, setInputValue] = useState('');
  const [myAnswers, setMyAnswers] = useState([]);
  const [opponentAnswers, setOpponentAnswers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [badgeStates, setBadgeStates] = useState(Array(MAX_BADGES).fill('empty'));

  const {
    question,
    remainingSec,
    roundInfo,
    typingSnapshot,
    answerJudged,
    summary,
    sendTypingSnapshot,
    submitAnswer,
    playerId,
  } = useBattleSocket({ sessionId, roomCode });

  const opponentTypingText = useMemo(() => {
    if (!typingSnapshot || typingSnapshot.playerId === playerId) return '';
    return typingSnapshot.text ?? '';
  }, [typingSnapshot, playerId]);

  const updateBadgeStates = (roundSummary) => {
    if (!Array.isArray(roundSummary)) return;
    const wins = roundSummary.filter((round) => round?.winner === playerId).length;
    const losses = roundSummary.filter((round) => round?.winner && round.winner !== playerId).length;
    const next = Array(MAX_BADGES).fill('empty');
    for (let i = 0; i < Math.min(wins, MAX_BADGES); i += 1) {
      next[i] = 'win';
    }
    for (let i = wins; i < Math.min(wins + losses, MAX_BADGES); i += 1) {
      next[i] = 'lose';
    }
    setBadgeStates(next);
  };

  useEffect(() => {
    if (sessionId && roomCode) {
      console.debug('[BattleRoomPage] mount', { sessionId, roomCode, role });
    }
  }, [sessionId, roomCode, role]);

  useEffect(() => {
    if (!answerJudged || !answerJudged.playerId) return;
    const entry = deriveAnswerEntry(answerJudged);
    const targetSetter = answerJudged.playerId === playerId ? setMyAnswers : setOpponentAnswers;
    targetSetter((prev) => {
      const next = [...prev, { ...entry, id: `${Date.now()}_${Math.random()}` }];
      return next.slice(-10);
    });
    if (Array.isArray(answerJudged.rounds)) {
      updateBadgeStates(answerJudged.rounds);
    } else if (Array.isArray(answerJudged.summary)) {
      updateBadgeStates(answerJudged.summary);
    }
  }, [answerJudged, playerId]);

  useEffect(() => {
    if (Array.isArray(summary?.rounds)) {
      updateBadgeStates(summary.rounds);
    } else if (Array.isArray(summary)) {
      updateBadgeStates(summary);
    }
  }, [summary]);

  useEffect(() => {
    if (question && !hasJoined) {
      console.debug('[BattleRoomPage] first question 수신, 참가 완료 처리');
      setHasJoined(true);
    }
  }, [question, hasJoined]);

  if (!sessionId) {
    return (
      <div className="battle-room">
        <div className="battle-room__container">
          <div className="battle-room__error">세션 정보가 없습니다. 다시 초대를 받아 입장해 주세요.</div>
        </div>
      </div>
    );
  }

  const currentRound = roundInfo?.current ?? 0;
  const totalRound = roundInfo?.total ?? 0;
  const questionText = question?.text ?? question?.sentence ?? '';
  const remainingSeconds = typeof remainingSec === 'number' && remainingSec >= 0 ? remainingSec : null;

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    if (!value.trim()) return;
    sendTypingSnapshot({ round: currentRound, text: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    try {
      await submitAnswer({ round: currentRound, answerText: trimmed });
      setInputValue('');
    } catch (error) {
      console.error('[BattleRoomPage] submit 실패', error);
    }
  };

  return (
    <div className="battle-room">
      <div className="battle-room__container">
        <header className="battle-room__header">
          <div className="battle-room__round">
            <strong>{currentRound || 1} ROUND</strong>
            {totalRound ? <span className="battle-room__round-total"> / {totalRound}</span> : null}
          </div>
          <h1 className="battle-room__title">받아쓰기 배틀</h1>
          <div className="battle-room__badges" aria-label="승패 배지">
            {badgeStates.map((state, index) => {
              if (state === 'win') {
                return (
                  <img
                    key={`badge-${index}`}
                    src={winLion}
                    alt="라운드 승리"
                    className="battle-room__badge"
                  />
                );
              }
              if (state === 'lose') {
                return (
                  <img
                    key={`badge-${index}`}
                    src={cryLion}
                    alt="라운드 패배"
                    className="battle-room__badge"
                  />
                );
              }
              return <div key={`badge-${index}`} className="battle-room__badge battle-room__badge--empty" />;
            })}
          </div>
        </header>

        <div className="battle-room__timer">
          <img src={timerIcon} alt="" className="battle-room__timer-icon" aria-hidden />
          <div className="battle-room__timer-text">
            {remainingSeconds !== null ? `${remainingSeconds}초` : '대기 중'}
          </div>
          <div className="battle-room__timer-bar">
            <div className="battle-room__timer-bar-fill" style={{ width: remainingSeconds ? `${Math.max(0, Math.min(remainingSeconds, 20)) * 5}%` : '0%' }} />
          </div>
        </div>

        <section className="battle-room__question">
          <p>{questionText}</p>
        </section>
        <section className="battle-room__board-title-container">
          <div className="battle-room__board-title">
            <img src={winLion} alt="" className="battle-room__board-title-icon" aria-hidden />
            나
          </div>
          <div className="battle-room__board-title">
            <img src={winLion} alt="" className="battle-room__board-title-icon" aria-hidden />
            너
          </div>
        </section>
        <section className="battle-room__board">
          <div className="battle-room__panel">
            <ul className="battle-room__answer-list">
              {myAnswers.map((item) => (
                <li key={item.id} className={item.isCorrect ? 'battle-room__answer battle-room__answer--correct' : 'battle-room__answer battle-room__answer--wrong'}>
                  <span>{item.text}</span>
                  <span className="battle-room__answer-result">{item.isCorrect ? 'O' : 'X'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="battle-room__panel battle-room__panel--opponent">
            <ul className="battle-room__answer-list">
              {opponentAnswers.map((item) => (
                <li key={item.id} className={item.isCorrect ? 'battle-room__answer battle-room__answer--correct' : 'battle-room__answer battle-room__answer--wrong'}>
                  <span>{item.text}</span>
                  <span className="battle-room__answer-result">{item.isCorrect ? 'O' : 'X'}</span>
                </li>
              ))}
            </ul>
            {opponentTypingText ? (
              <div className="battle-room__typing">상대가 입력 중: {opponentTypingText}</div>
            ) : null}
          </div>
        </section>

        <form className="battle-room__form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="정답을 입력해 주세요!"
            className="battle-room__input"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}

export default BattleRoomPage;
