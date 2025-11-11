import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBattleSocket } from '../hooks/useBattleSocket';
import { getBattleSession } from '../services/battleApi';
import winLion from '../assets/win_lion.svg';
import cryLion from '../assets/cry_lion.svg';
import timerIcon from '../assets/timer.svg';
import './BattleRoomPage.css';

function deriveAnswerEntry(source = {}) {
  if (!source) return { text: '', isCorrect: false };
  const textCandidate =
    source.submittedText ??
    source.answer ??
    source.answerText ??
    source.text ??
    source.content ??
    source.preview ??
    source.submittedText ??
    '';
  const text =
    typeof textCandidate === 'string' && textCandidate.trim().length > 0
      ? textCandidate.trim()
      : (Array.isArray(source.answers) ? source.answers.join(', ') : '') || DEFAULT_PLACEHOLDER;
  const resultFlag = typeof source.result === 'string' ? source.result.toUpperCase() : source.result;
  const isCorrect = Boolean(
    source.isCorrect ?? source.correct ?? resultFlag === 'CORRECT' ?? resultFlag === 'PASS',
  );
  return { text, isCorrect };
}

const MAX_BADGES = 5;
const DEFAULT_PLACEHOLDER = '(내용 없음)';

function BattleRoomPage({ sessionId, roomCode, role = 'guest' }) {
  const [inputValue, setInputValue] = useState('');
  const [myAnswers, setMyAnswers] = useState([]);
  const [opponentAnswers, setOpponentAnswers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [badgeStates, setBadgeStates] = useState(Array(MAX_BADGES).fill('empty'));
  const pendingAnswersRef = useRef({});
  const latestTypingRef = useRef({});
  const inputRef = useRef(null);
  const isComposingRef = useRef(false);
  const previousRoundRef = useRef(null);

  const connectDelayMs = role === 'host' ? 500 : 0;
  const joinInitialDelayMs = role === 'host' ? 1500 : 600;

  const {
    question,
    remainingSec,
    roundInfo,
    typingSnapshot,
    answerJudged,
    roundEndEvent,
    sendTypingSnapshot,
    submitAnswer,
    playerId,
  } = useBattleSocket({ sessionId, roomCode, connectDelayMs, joinInitialDelayMs });

  const loadBadgeStates = useCallback(async () => {
    if (!sessionId || !playerId) return null;
    const response = await getBattleSession(sessionId);
    console.log('[BattleRoomPage] 배지 summary 응답', {
      sessionId,
      playerId,
      summary: response?.summary,
    });
    const mySummary = Array.isArray(response?.summary)
      ? response.summary.find((entry) => entry?.playerId === playerId)
      : null;
    if (!mySummary) {
      console.warn('[BattleRoomPage] 내 요약 정보를 찾지 못했습니다.', {
        playerId,
        summary: response?.summary,
      });
      return null;
    }
    const roundResults = Array.isArray(mySummary?.isCorrectByRound) ? mySummary.isCorrectByRound : null;
    if (!roundResults) {
      console.log('[BattleRoomPage] 배지 정보 응답에 isCorrectByRound 없음', {
        sessionId,
        playerId,
        summary: response?.summary,
      });
      return null;
    }
    const next = Array(MAX_BADGES).fill('empty');
    for (let i = 0; i < Math.min(roundResults.length, MAX_BADGES); i += 1) {
      if (roundResults[i] === true) {
        next[i] = 'win';
      } else if (roundResults[i] === false) {
        next[i] = 'lose';
      }
    }
    return { next, roundResults };
  }, [sessionId, playerId]);

  const opponentTypingText = useMemo(() => {
    if (!typingSnapshot || typingSnapshot.playerId === playerId) return '';
    const raw = typingSnapshot.preview ?? typingSnapshot.text ?? typingSnapshot.answerText ?? '';
    return typeof raw === 'string' ? raw : '';
  }, [typingSnapshot, playerId]);

  useEffect(() => {
    if (!typingSnapshot?.playerId) return;
    const textValue = typeof typingSnapshot.text === 'string' ? typingSnapshot.text : '';
    latestTypingRef.current[typingSnapshot.playerId] = textValue;
  }, [typingSnapshot]);

  useEffect(() => {
    if (sessionId && roomCode) {
      console.debug('[BattleRoomPage] mount', { sessionId, roomCode, role });
    }
  }, [sessionId, roomCode, role]);

  useEffect(() => {
    console.debug('[BattleRoomPage] roundInfo 업데이트', roundInfo);
  }, [roundInfo]);

  useEffect(() => {
    if (!question) return;
    console.debug('[BattleRoomPage] question 업데이트', question);
  }, [question]);

  useEffect(() => {
    if (typeof remainingSec === 'number') {
      console.debug('[BattleRoomPage] remainingSec 업데이트', remainingSec);
    }
  }, [remainingSec]);

  useEffect(() => {
    if (!answerJudged || !answerJudged.playerId) return;
    console.debug('[BattleRoomPage] answerJudged 수신', answerJudged);
    console.debug('[BattleRoomPage] 최신 typingSnapshot 기록', latestTypingRef.current);
    console.debug('[BattleRoomPage] pendingAnswersRef', pendingAnswersRef.current);
    const entryKey = `${answerJudged.playerId}:${answerJudged.round ?? roundInfo?.current ?? 0}`;
    const entry = deriveAnswerEntry(answerJudged);
    if (!entry.text || entry.text === '(내용 없음)') {
      const pending = pendingAnswersRef.current[entryKey];
      if (pending && pending.trim().length > 0) {
        entry.text = pending;
        console.debug('[BattleRoomPage] pendingAnswersRef 활용', { entryKey, text: entry.text });
      } else {
        const latestTyping = latestTypingRef.current[answerJudged.playerId];
        if (latestTyping && latestTyping.trim().length > 0) {
          entry.text = latestTyping;
          console.debug('[BattleRoomPage] latestTyping 활용', {
            playerId: answerJudged.playerId,
            text: entry.text,
          });
        }
        if (!entry.text || entry.text.trim().length === 0) {
          entry.text = DEFAULT_PLACEHOLDER;
        }
      }
    }
    delete pendingAnswersRef.current[entryKey];
    const isMine = answerJudged.playerId === playerId;
    const targetSetter = isMine ? setMyAnswers : setOpponentAnswers;
    targetSetter((prev) => {
      const next = [...prev, { ...entry, id: `${Date.now()}_${Math.random()}` }];
      return next.slice(-10);
    });
  }, [answerJudged, playerId]);

  useEffect(() => {
    if (!sessionId || !playerId) return;
    const currentRound = typeof roundInfo?.current === 'number' ? roundInfo.current : null;
    const previousRound =
      typeof previousRoundRef.current === 'number' ? previousRoundRef.current : null;

    let shouldFetch = false;
    let reason = null;

    if (typeof currentRound === 'number' && currentRound > 0) {
      if (previousRound === null || Number.isNaN(previousRound)) {
        shouldFetch = true;
        reason = 'INITIAL_LOAD';
      } else if (typeof previousRound === 'number' && currentRound > previousRound) {
        shouldFetch = true;
        reason = `ROUND_ADVANCED_${previousRound}_TO_${currentRound}`;
      }
    }

    previousRoundRef.current = currentRound;

    if (!shouldFetch) {
      return;
    }

    let cancelled = false;
    (async () => {
      console.log('[BattleRoomPage] 배지 정보 갱신 요청 시작', {
        sessionId,
        playerId,
        reason,
        previousRound,
        currentRound,
      });
      try {
        const result = await loadBadgeStates();
        if (!result) return;
        if (!cancelled) {
          const { next, roundResults } = result;
          console.log('[BattleRoomPage] 배지 정보 갱신 완료', { next, roundResults, reason });
          setBadgeStates(next);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[BattleRoomPage] 배지 정보 갱신 실패', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, playerId, roundInfo?.current, loadBadgeStates]);

  useEffect(() => {
    if (!sessionId || !playerId) return;
    if (!roundEndEvent || roundEndEvent.state !== 'ENDED') return;
    let cancelled = false;
    console.log('[BattleRoomPage] 배지 정보 갱신 요청 시작', {
      sessionId,
      playerId,
      reason: 'FINAL_ROUND_ENDED',
      roundEndEvent,
    });
    (async () => {
      try {
        const result = await loadBadgeStates();
        if (!result) return;
        if (!cancelled) {
          const { next, roundResults } = result;
          console.log('[BattleRoomPage] 배지 정보 갱신 완료', { next, roundResults, reason: 'FINAL_ROUND_ENDED' });
          setBadgeStates(next);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[BattleRoomPage] 배지 정보 갱신 실패', error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, playerId, roundEndEvent, loadBadgeStates]);

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
  const questionText =
    question?.text ??
    question?.sentence ??
    question?.correctSentence ??
    question?.question ??
    question?.value ??
    DEFAULT_PLACEHOLDER;
  const remainingSeconds = typeof remainingSec === 'number' && remainingSec >= 0 ? remainingSec : null;
  const myRoundWins = badgeStates.filter((state) => state === 'win').length;
  const opponentRoundWins = badgeStates.filter((state) => state === 'lose').length;

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    if (isComposingRef.current) {
      return;
    }
    if (!value) return;
    console.debug('[BattleRoomPage] handleInputChange', { value, round: currentRound, playerId });
    sendTypingSnapshot({ round: currentRound, text: value });
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (event) => {
    isComposingRef.current = false;
    const value = event.target.value;
    setInputValue(value);
    if (!value) return;
    console.debug('[BattleRoomPage] handleCompositionEnd', { value, round: currentRound, playerId });
    sendTypingSnapshot({ round: currentRound, text: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const rawValue = inputRef.current ? inputRef.current.value : inputValue;
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    try {
      console.log('[BattleRoomPage] handleSubmit', {
        rawValue,
        trimmed,
        round: currentRound,
        playerId,
      });
      if (playerId) {
        const key = `${playerId}:${currentRound}`;
        pendingAnswersRef.current[key] = trimmed;
        console.debug('[BattleRoomPage] pendingAnswersRef 저장', { key, value: trimmed });
      }
      await submitAnswer({ round: currentRound, answerText: trimmed });
      console.log('[BattleRoomPage] 소켓 정답 제출 성공', {
        round: currentRound,
        playerId,
      });
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      sendTypingSnapshot({ round: currentRound, text: '' });
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
            {myRoundWins > 0 && <span className="battle-room__win-count">+{myRoundWins}</span>}
          </div>
          <div className="battle-room__board-title">
            <img src={winLion} alt="" className="battle-room__board-title-icon" aria-hidden />
            너
            {opponentRoundWins > 0 && (
              <span className="battle-room__win-count battle-room__win-count--opponent">
                +{opponentRoundWins}
              </span>
            )}
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
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
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
