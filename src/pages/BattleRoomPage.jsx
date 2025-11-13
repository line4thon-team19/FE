import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBattleSocket } from '../hooks/useBattleSocket';
import { getBattleSession } from '../services/battleApi';
import winLion from '../assets/win_lion.svg';
import cryLion from '../assets/cry_lion.svg';
import timerIcon from '../assets/timer.svg';
import audioIcon from '../assets/audio.svg';
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
const ROUND_DURATION_SEC = 30;
const DEFAULT_PLACEHOLDER = '(내용 없음)';

function BattleRoomPage({ sessionId, roomCode, role = 'guest' }) {
  const [inputValue, setInputValue] = useState('');
  const [myAnswers, setMyAnswers] = useState([]);
  const [opponentAnswers, setOpponentAnswers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [badgeStates, setBadgeStates] = useState(Array(MAX_BADGES).fill('empty'));
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pendingAnswersRef = useRef({});
  const latestTypingRef = useRef({});
  const inputRef = useRef(null);
  const isComposingRef = useRef(false);
  const previousRoundRef = useRef(null);
  const lastSpokenKeyRef = useRef(null);
  const [preloadedQuestions, setPreloadedQuestions] = useState([]);

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
    const mySummary = Array.isArray(response?.summary)
      ? response.summary.find((entry) => entry?.playerId === playerId)
      : null;
    if (!mySummary) return null;
    const roundResults = Array.isArray(mySummary?.isCorrectByRound) ? mySummary.isCorrectByRound : null;
    if (!roundResults) return null;
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

  const speechSupported = useMemo(
    () => typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined',
    [],
  );
  const voicesRef = useRef([]);
  const speechUtteranceRef = useRef(null);
  const [voicesReady, setVoicesReady] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const pendingSpeakRef = useRef(null);
  useEffect(() => {
    if (!sessionId) return;
    try {
      const stored = sessionStorage.getItem(`battleQuestions:${sessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPreloadedQuestions(parsed);
        }
      }
    } catch (error) {
      console.warn('[BattleRoomPage] preloaded questions 로드 실패', error);
    }
  }, [sessionId]);

  const fallbackQuestionEntry = useMemo(() => {
    if (!Array.isArray(preloadedQuestions) || preloadedQuestions.length === 0) return null;
    const index =
      typeof roundInfo?.current === 'number' && roundInfo.current > 0
        ? roundInfo.current - 1
        : 0;
    return preloadedQuestions[index] ?? null;
  }, [preloadedQuestions, roundInfo?.current]);

  const questionSpeechText = useMemo(() => {
    const candidate =
      question?.text ??
      question?.sentence ??
      question?.correctSentence ??
      question?.question ??
      question?.value ??
      fallbackQuestionEntry?.text ??
      fallbackQuestionEntry?.question ??
      '';
    return typeof candidate === 'string' ? candidate.trim() : '';
  }, [question, fallbackQuestionEntry]);

  const questionIdentifier =
    question?.questionId ??
    question?.id ??
    fallbackQuestionEntry?.questionId ??
    fallbackQuestionEntry?.id ??
    null;
  const questionKey = useMemo(() => {
    if (!questionSpeechText) return null;
    const baseId = questionIdentifier ?? `round-${roundInfo?.current ?? 'unknown'}`;
    return `${baseId}::${questionSpeechText}`;
  }, [questionIdentifier, questionSpeechText, roundInfo?.current]);

  const opponentTypingText = useMemo(() => {
    if (!typingSnapshot || typingSnapshot.playerId === playerId) return '';
    const raw = typingSnapshot.preview ?? typingSnapshot.text ?? typingSnapshot.answerText ?? '';
    return typeof raw === 'string' ? raw : '';
  }, [typingSnapshot, playerId]);

  const timerFillWidth = useMemo(() => {
    if (remainingSec === null || remainingSec === undefined) return '0%';
    const ratio = Math.min(Math.max(remainingSec / ROUND_DURATION_SEC, 0), 1);
    return `${ratio * 100}%`;
  }, [remainingSec]);

  const speakQuestion = useCallback(
    (force = false) => {
      console.log('[BattleRoomPage:TTS] speakQuestion 호출', {
        force,
        speechSupported,
        questionKey,
        questionSpeechText,
        voicesReady,
        voicesCount: voicesRef.current.length,
      });
      if (!speechSupported) {
        setSpeechError(new Error('현재 브라우저에서 음성 합성을 사용할 수 없습니다.'));
        return false;
      }
      if (!questionKey || !questionSpeechText) {
        setSpeechError(new Error('읽을 문장이 없습니다.'));
        return false;
      }
      if (!force && lastSpokenKeyRef.current === questionKey) {
        return false;
      }
      try {
        const synth = window.speechSynthesis;
        const isBusy = synth.speaking || synth.pending;
        if (isBusy) {
          if (!force) {
            console.log('[BattleRoomPage:TTS] 재생 중, 새 요청 무시', { questionKey });
            return false;
          }
          pendingSpeakRef.current = {
            key: questionKey,
            text: questionSpeechText,
            ts: Date.now(),
          };
          synth.cancel();
          console.log('[BattleRoomPage:TTS] 기존 음성 재생 취소 (재시도 예정)', pendingSpeakRef.current);
          return false;
        }
        const UtteranceCtor =
          (typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function'
            ? window.SpeechSynthesisUtterance
            : undefined) ??
          (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : undefined);
        if (!UtteranceCtor) {
          setSpeechError(new Error('음성 합성 객체를 생성할 수 없습니다.'));
          console.error('[BattleRoomPage:TTS] SpeechSynthesisUtterance 생성 불가');
          return false;
        }
        const utterance = new UtteranceCtor(questionSpeechText);
        const hasKorean = /[가-힣]/.test(questionSpeechText);
        const preferredVoice =
          voicesRef.current.find((voice) =>
            voice.lang?.toLowerCase().startsWith(hasKorean ? 'ko' : 'en'),
          ) ??
          voicesRef.current.find((voice) =>
            voice.lang?.toLowerCase().includes(hasKorean ? 'ko' : 'en'),
          ) ??
          voicesRef.current[0] ??
          null;
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang;
        } else {
          utterance.lang = hasKorean ? 'ko-KR' : 'en-US';
        }
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeechError(null);
          console.log('[BattleRoomPage:TTS] 음성 재생 시작', { questionKey });
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          if (speechUtteranceRef.current === utterance) {
            speechUtteranceRef.current = null;
          }
          console.log('[BattleRoomPage:TTS] 음성 재생 종료', { questionKey });
          const pending = pendingSpeakRef.current;
          if (pending && pending.key === questionKey) {
            pendingSpeakRef.current = null;
            console.log('[BattleRoomPage:TTS] 취소 후 재시도 실행', pending);
            setTimeout(() => {
              speakQuestion(true);
            }, 100);
          }
        };
        utterance.onerror = (event) => {
          setIsSpeaking(false);
          if (event?.error === 'canceled') {
            console.warn('[BattleRoomPage:TTS] 음성 재생이 취소되었습니다.', { questionKey });
            lastSpokenKeyRef.current = null;
            const pending = pendingSpeakRef.current;
            if (pending && pending.key === questionKey) {
              pendingSpeakRef.current = null;
              console.log('[BattleRoomPage:TTS] 취소 오류 후 재시도 실행', pending);
              setTimeout(() => {
                speakQuestion(true);
              }, 120);
            }
          } else {
            setSpeechError(new Error(event?.error || '음성 재생 중 오류가 발생했습니다.'));
          }
          if (speechUtteranceRef.current === utterance) {
            speechUtteranceRef.current = null;
          }
          console.error('[BattleRoomPage:TTS] 음성 재생 오류', { questionKey, event });
        };
        speechUtteranceRef.current = utterance;
        lastSpokenKeyRef.current = questionKey;
        synth.resume();
        synth.speak(utterance);
        console.log('[BattleRoomPage:TTS] speechSynthesis.speak 호출 완료', { questionKey });
        return true;
      } catch (error) {
        setIsSpeaking(false);
        setSpeechError(error instanceof Error ? error : new Error('음성 합성 실패'));
        console.error('[BattleRoomPage:TTS] 음성 합성 예외', error);
        return false;
      }
    },
    [speechSupported, questionKey, questionSpeechText, voicesReady],
  );

  useEffect(() => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    const handleVoices = () => {
      const voices = synth.getVoices() ?? [];
      voicesRef.current = voices;
      setVoicesReady(voices.length > 0);
      console.log('[BattleRoomPage:TTS] voice 목록 로드', { count: voices.length });
    };
    handleVoices();
    synth.addEventListener('voiceschanged', handleVoices);
    return () => {
      synth.removeEventListener('voiceschanged', handleVoices);
    };
  }, [speechSupported]);

  useEffect(() => {
    if (!speechSupported) return;
    if (!questionKey || !questionSpeechText) {
      setIsSpeaking(false);
      lastSpokenKeyRef.current = null;
      console.log('[BattleRoomPage:TTS] 자동 재생 취소 - 질문 없음', {
        questionKey,
        questionSpeechText,
      });
      return;
    }
    if (!voicesReady) {
      console.log('[BattleRoomPage:TTS] 자동 재생 대기 - 음성 목록 준비 중');
      return;
    }
    console.log('[BattleRoomPage:TTS] 자동 재생 시도', { questionKey });
    speakQuestion(false);
  }, [speechSupported, voicesReady, questionKey, questionSpeechText, speakQuestion]);

  useEffect(() => {
    return () => {
      if (!speechSupported) return;
      const synth = window.speechSynthesis;
      if (synth.speaking) {
        synth.cancel();
      }
      speechUtteranceRef.current = null;
      lastSpokenKeyRef.current = null;
    };
  }, [speechSupported]);

  useEffect(() => {
    if (!typingSnapshot?.playerId) return;
    const textValue = typeof typingSnapshot.text === 'string' ? typingSnapshot.text : '';
    latestTypingRef.current[typingSnapshot.playerId] = textValue;
  }, [typingSnapshot]);


  useEffect(() => {
    if (!answerJudged || !answerJudged.playerId) return;
    const entryKey = `${answerJudged.playerId}:${answerJudged.round ?? roundInfo?.current ?? 0}`;
    const entry = deriveAnswerEntry(answerJudged);
    if (!entry.text || entry.text === '(내용 없음)') {
      const pending = pendingAnswersRef.current[entryKey];
      if (pending && pending.trim().length > 0) {
        entry.text = pending;
      } else {
        const latestTyping = latestTypingRef.current[answerJudged.playerId];
        if (latestTyping && latestTyping.trim().length > 0) {
          entry.text = latestTyping;
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
      try {
        const result = await loadBadgeStates();
        if (!result) return;
        if (!cancelled) {
          const { next, roundResults } = result;
          setBadgeStates(next);
        }
      } catch (error) {
        if (!cancelled) void error;
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
    (async () => {
      try {
        const result = await loadBadgeStates();
        if (!result) return;
        if (!cancelled) {
          const { next, roundResults } = result;
          setBadgeStates(next);
        }
      } catch (error) {
        if (!cancelled) void error;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, playerId, roundEndEvent, loadBadgeStates]);

  useEffect(() => {
    if (question && !hasJoined) {
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
  const questionAriaLabel = questionSpeechText
    ? `질문 다시 듣기: ${questionSpeechText}`
    : '질문 다시 듣기';
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
    sendTypingSnapshot({ round: currentRound, text: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const rawValue = inputRef.current ? inputRef.current.value : inputValue;
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    try {
      if (playerId) {
        const key = `${playerId}:${currentRound}`;
        pendingAnswersRef.current[key] = trimmed;
      }
      await submitAnswer({ round: currentRound, answerText: trimmed });
      setInputValue('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      sendTypingSnapshot({ round: currentRound, text: '' });
    } catch (error) {
      void error;
    }
  };

  return (
    <div className="battle-room">
      <div className="battle-room__container">
        <header className="battle-room__header">
          <div className="battle-room__round">
            <strong>{currentRound || 1} ROUND</strong>
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
            <div className="battle-room__timer-bar-fill" style={{ width: timerFillWidth }} />
          </div>
        </div>

        <section className="battle-room__question">
          {speechSupported ? (
            <button
              type="button"
              className={`battle-room__question-audio${
                isSpeaking ? ' battle-room__question-audio--speaking' : ''
              }`}
              onClick={() => {
                speakQuestion(true);
              }}
              aria-label={questionAriaLabel}
            >
              <img src={audioIcon} alt="" className="battle-room__question-audio-icon" aria-hidden />
            </button>
          ) : (
            <span className="battle-room__question-audio-hint battle-room__question-audio-hint--error">
              현재 브라우저에서는 음성 합성을 사용할 수 없습니다.
            </span>
          )}
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
