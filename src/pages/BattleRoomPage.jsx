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
const TTS_ENDPOINT = 'https://zyxjbccowxzomkmgqrie.supabase.co/functions/v1/tts';

function BattleRoomPage({ sessionId, roomCode, role = 'guest' }) {
  const [inputValue, setInputValue] = useState('');
  const [myAnswers, setMyAnswers] = useState([]);
  const [opponentAnswers, setOpponentAnswers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [badgeStates, setBadgeStates] = useState(Array(MAX_BADGES).fill('empty'));
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const pendingAnswersRef = useRef({});
  const latestTypingRef = useRef({});
  const inputRef = useRef(null);
  const isComposingRef = useRef(false);
  const previousRoundRef = useRef(null);
  const [preloadedQuestions, setPreloadedQuestions] = useState([]);
  const audioRef = useRef(null);
  const speakTimeoutRef = useRef(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState(null);

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

  useEffect(() => {
    let isActive = true;
    if (!questionSpeechText) {
      setTtsError(null);
      setTtsAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    setTtsLoading(true);
    setTtsError(null);

    const fetchTts = async () => {
      try {
        const response = await fetch(TTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: questionSpeechText }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('TTS 생성 요청이 실패했습니다.');
        }
        const data = await response.json();
        if (!data?.audio) {
          throw new Error('TTS 오디오 데이터가 없습니다.');
        }
        const audioResponse = await fetch(`data:audio/mp3;base64,${data.audio}`);
        const blob = await audioResponse.blob();
        if (!isActive) return;
        const objectUrl = URL.createObjectURL(blob);
        setTtsAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (error) {
        if (!isActive || error.name === 'AbortError') return;
        setTtsAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setTtsError(
          error instanceof Error ? error : new Error('TTS 변환 중 오류가 발생했습니다.'),
        );
      } finally {
        if (isActive) {
          setTtsLoading(false);
        }
      }
    };

    fetchTts();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [questionKey, questionSpeechText]);

  useEffect(() => {
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    if (!ttsAudioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsAudioPlaying(false);
      return;
    }

    const audio = new Audio(ttsAudioUrl);
    audioRef.current = audio;

    const handlePlay = () => {
      setIsAudioPlaying(true);
      setTtsError(null);
    };
    const handleEnd = () => setIsAudioPlaying(false);
    const handlePause = () => setIsAudioPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('pause', handlePause);

    speakTimeoutRef.current = setTimeout(() => {
      audio
        .play()
        .catch(() => {
          setTtsError(
            new Error('브라우저에서 자동 재생이 차단되었습니다. 스피커 버튼을 눌러 주세요.'),
          );
        });
    }, 200);

    return () => {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('pause', handlePause);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      URL.revokeObjectURL(ttsAudioUrl);
    };
  }, [ttsAudioUrl]);

  const handlePlayButtonClick = useCallback(() => {
    if (!audioRef.current) {
      setTtsError(new Error('음성이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      setTtsError(new Error('브라우저에서 음성 재생이 차단되었습니다. 다시 시도해 주세요.'));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
    };
  }, [ttsAudioUrl]);

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
          <button
            type="button"
            className={`battle-room__question-audio${
              isAudioPlaying ? ' battle-room__question-audio--speaking' : ''
            }`}
            onClick={handlePlayButtonClick}
            aria-label={questionAriaLabel}
            disabled={ttsLoading || !ttsAudioUrl}
          >
            <img src={audioIcon} alt="" className="battle-room__question-audio-icon" aria-hidden />
          </button>
          {ttsLoading ? (
            <span className="battle-room__question-audio-hint">음성을 준비하는 중...</span>
          ) : null}
          {ttsError ? (
            <span className="battle-room__question-audio-hint battle-room__question-audio-hint--error">
              {ttsError.message}
            </span>
          ) : null}
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
