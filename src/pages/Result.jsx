import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ResultCard from '../components/ResultCard';
import LionComment from '../components/LionComment';
import { Link, useParams, useLocation } from 'react-router-dom';
import right_icon from '../assets/right.svg';
import left_icon from '../assets/left.svg'

const BASE_URL_DOMAIN = 'https://hyunseoko.store';
const DEFAULT_USER_INPUT = '입력 없음';

const normalizeResultFlag = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  return value.trim().toLowerCase();
};

const pickFirstNonEmptyString = (source, keys = []) => {
  if (!source) return null;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const pickStringFromArray = (maybeArray) => {
  if (!Array.isArray(maybeArray)) return null;
  for (const entry of maybeArray) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      return entry.trim();
    }
  }
  return null;
};

const resolveExplanation = (roundDetail) => {
  const explanation =
    pickFirstNonEmptyString(roundDetail, ['explanation', 'standardRule', 'rule', 'reason']) ??
    pickFirstNonEmptyString(roundDetail?.question, ['explanation', 'standardRule', 'rule', 'reason']);
  return explanation || '';
};

const resolveCorrectAnswer = (roundDetail) => {
  const correctAnswer =
    pickFirstNonEmptyString(roundDetail, ['correctAnswer', 'correctText', 'correct']) ??
    pickFirstNonEmptyString(roundDetail?.question, [
      'correctAnswer',
      'correctText',
      'answerText',
      'answer',
      'text',
    ]) ??
    pickStringFromArray(roundDetail?.correctAnswers) ??
    pickStringFromArray(roundDetail?.question?.answers);
  return correctAnswer || '';
};

const derivePracticeAnswerInfo = (roundDetail) => {
  const text =
    pickFirstNonEmptyString(roundDetail, [
      'answerText',
      'answer',
      'userAnswer',
      'submittedAnswer',
      'input',
    ]) ??
    pickStringFromArray(roundDetail?.answers) ??
    DEFAULT_USER_INPUT;

  if (typeof roundDetail?.isCorrect === 'boolean') {
    return { text, isCorrect: roundDetail.isCorrect };
  }

  const normalizedResult = normalizeResultFlag(roundDetail?.result ?? roundDetail?.status);

  if (normalizedResult) {
    if (['correct', 'pass', 'success', 'right', 'win'].includes(normalizedResult)) {
      return { text, isCorrect: true };
    }
    if (['wrong', 'fail', 'incorrect', 'lose'].includes(normalizedResult)) {
      return { text, isCorrect: false };
    }
  }

  return { text, isCorrect: false };
};

const selectBattlePlayerEntry = (roundDetail, playerId) => {
  const players = Array.isArray(roundDetail?.players) ? roundDetail.players : [];
  if (players.length === 0) {
    return null;
  }
  if (playerId) {
    const matched =
      players.find(
        (player) =>
          player?.playerId === playerId ||
          player?.id === playerId ||
          player?.guestId === playerId ||
          player?.userId === playerId,
      ) ?? null;
    if (matched) {
      return matched;
    }
  }
  const hostCandidate = players.find((player) => player?.isHost) ?? null;
  if (hostCandidate) {
    return hostCandidate;
  }
  return players[0];
};

const deriveBattleAnswerInfo = (
  roundDetail,
  playerId,
  storedAnswers = {},
  fallbackRoundNumber = null,
) => {
  const playerEntry = selectBattlePlayerEntry(roundDetail, playerId) ?? {};
  const candidateRound =
    typeof roundDetail?.round === 'number' && roundDetail.round > 0
      ? roundDetail.round
      : fallbackRoundNumber;
  const storedEntryRaw =
    candidateRound !== null && candidateRound !== undefined
      ? storedAnswers?.[candidateRound] ?? storedAnswers?.[String(candidateRound)] ?? null
      : null;
  const storedEntry =
    storedEntryRaw && typeof storedEntryRaw === 'object'
      ? storedEntryRaw
      : typeof storedEntryRaw === 'string'
        ? { text: storedEntryRaw, isCorrect: null }
        : null;

  const storedText =
    storedEntry && typeof storedEntry.text === 'string' && storedEntry.text.trim().length > 0
      ? storedEntry.text.trim()
      : null;

  const text =
    pickFirstNonEmptyString(playerEntry, [
      'submittedText',
      'answerText',
      'answer',
      'userAnswer',
      'input',
      'value',
      'content',
    ]) ??
    pickFirstNonEmptyString(roundDetail, [
      'submittedText',
      'answerText',
      'answer',
      'userAnswer',
      'input',
    ]) ??
    pickStringFromArray(playerEntry?.answers) ??
    pickStringFromArray(roundDetail?.answers) ??
    storedText ??
    DEFAULT_USER_INPUT;

  let resolvedIsCorrect = null;

  if (typeof playerEntry?.isCorrect === 'boolean') {
    resolvedIsCorrect = playerEntry.isCorrect;
  }

  const normalizedPlayerResult = normalizeResultFlag(playerEntry?.result ?? playerEntry?.status);
  if (normalizedPlayerResult) {
    if (['correct', 'pass', 'success', 'right', 'win'].includes(normalizedPlayerResult)) {
      resolvedIsCorrect = true;
    } else if (['wrong', 'fail', 'incorrect', 'lose'].includes(normalizedPlayerResult)) {
      resolvedIsCorrect = false;
    }
  }

  if (typeof roundDetail?.isCorrect === 'boolean') {
    resolvedIsCorrect = roundDetail.isCorrect;
  }

  const normalizedRoundResult = normalizeResultFlag(roundDetail?.result ?? roundDetail?.status);
  if (normalizedRoundResult) {
    if (['correct', 'pass', 'success', 'right', 'win'].includes(normalizedRoundResult)) {
      resolvedIsCorrect = true;
    } else if (['wrong', 'fail', 'incorrect', 'lose'].includes(normalizedRoundResult)) {
      resolvedIsCorrect = false;
    }
  }

  if (storedEntry && typeof storedEntry.isCorrect === 'boolean') {
    resolvedIsCorrect = storedEntry.isCorrect;
  }

  return { text, isCorrect: resolvedIsCorrect };
};

const loadKakaoSDK = (appKey) => {
  // SDK가 이미 초기화되었는지 확인
  if (window.Kakao && window.Kakao.isInitialized()) {
    return;
  }

  // index.html에 스크립트를 추가했더라도, 여기서 다시 한번 초기화 시도
  if (window.Kakao) {
    try {
      window.Kakao.init(appKey);
    } catch (e) {
      // 카카오 SDK 초기화 오류
    }
  }
};

const Result = () => {
  const { sessionId, practiceId } = useParams();
  const location = useLocation();

  const [gameResult, setGameResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  const isPracticeMode = location.pathname.includes('/practice/');
  const currentId = isPracticeMode ? practiceId : sessionId;
  const storedBattleAnswers = useMemo(() => {
    if (isPracticeMode) return {};
    if (!sessionId) return {};
    if (typeof window === 'undefined') return {};
    try {
      const raw = sessionStorage.getItem(`battleAnswers:${sessionId}`);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const normalized = {};
        Object.keys(parsed).forEach((key) => {
          const value = parsed[key];
          if (value && typeof value === 'object') {
            normalized[key] = {
              ...(typeof value.text === 'string' ? { text: value.text } : {}),
              ...(typeof value.isCorrect === 'boolean'
                ? { isCorrect: value.isCorrect }
                : value.isCorrect === null
                  ? { isCorrect: null }
                  : {}),
            };
          } else if (typeof value === 'string') {
            normalized[key] = { text: value, isCorrect: null };
          }
        });
        return normalized;
      }
    } catch (error) {
      console.warn('[Result] battleAnswers 로드 실패', error);
    }
    return {};
  }, [isPracticeMode, sessionId]);

  // 환경번수에서 앱키 불러오기
  const KAKAO_APP_KEY = (typeof process !== 'undefined' && process.env.REACT_APP_KAKAO_API_KEY)
    ? process.env.REACT_APP_KAKAO_API_KEY
    : '3f8528d1896ea96379f728bfb2ac6889';

  useEffect(() => {

    if (KAKAO_APP_KEY) {
      loadKakaoSDK(KAKAO_APP_KEY);
    }

    if (!currentId) {
      setError("게임/연습 ID가 필요합니다. 올바른 경로로 접속했는지 확인해주세요.");
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      let API_URL;
      let headers = { 'Accept': 'application/json' };

      const token = localStorage.getItem('authToken');

      if (!token) {
        setError("인증 토큰이 없어 결과를 불러올 수 없습니다. 메인 페이지에서 토큰 발급을 확인하세요.");
        setLoading(false);
        return;
      }

      headers['Authorization'] = `Bearer ${token}`;

      if (isPracticeMode) {
        // 캐시 무효화 파라미터 추가
        API_URL = `${BASE_URL_DOMAIN}/api/practice/${currentId}/result?t=${Date.now()}`;
      } else {
        // 캐시 무효화 파라미터 추가
        API_URL = `${BASE_URL_DOMAIN}/api/battle/${currentId}/result?t=${Date.now()}`;
      }

      try {
        const response = await axios.get(API_URL, { headers });

        if (isPracticeMode && response.data.questions) {
          const correctCount = response.data.questions.filter(q => q.result === 'correct').length;
          response.data.calculatedScore = correctCount;
        }

        setGameResult(response.data);
        setLoading(false);
      } catch (err) {

        if (err.response) {
          if (err.response.status === 401 || err.response.status === 403) {
            setError("인증 토큰이 유효하지 않거나 권한이 없습니다.");
          } else if (err.response.status === 404) {
            setError(`해당 ${isPracticeMode ? '연습 세션' : '게임 세션'}을 찾을 수 없습니다.`);
          } else {
            setError(`결과를 불러오는 데 실패했습니다. (상태 코드: ${err.response.status})`);
          }
        } else {
          setError("네트워크 오류로 서버에 접속할 수 없습니다.");
        }
        setLoading(false);
      }
    };

    fetchResult();
  }, [currentId, isPracticeMode, KAKAO_APP_KEY]);


  if (loading) {
    return <div id="Result_wrap">결과를 불러오는 중입니다...</div>;
  }

  if (error) {
    return (
      <div id="Result_wrap">
        <h1 style={{ color: 'red' }}>에러 발생</h1>
        <p>{error}</p>
        <Link to='/'>
          <button className="home">홈으로 돌아가기</button>
        </Link>
      </div>
    );
  }

  let roundDetails;
  let roundFieldName;

  if (isPracticeMode) {
    // 연습 모드 API 응답은 'questions' 필드를 사용
    roundDetails = gameResult.questions;
    roundFieldName = 'questions';
  } else {
    // 배틀 모드 API 응답은 'rounds' 필드를 사용
    roundDetails = gameResult.rounds;
    roundFieldName = 'rounds';
  }

  if (!gameResult || !roundDetails || !Array.isArray(roundDetails)) {
    return (
      <div id="Result_wrap">
        결과 데이터 구조가 올바르지 않습니다. ({roundFieldName} 필드 누락)
      </div>
    );
  }


  // 배틀 모드에서 로컬 저장 데이터로 승패 판정
  const localPlayerId =
    typeof window !== 'undefined' ? sessionStorage.getItem('guestPlayerId') ?? null : null;
  
  let finalStatus = 'practice';
  let correctScore = 0;
  
  if (isPracticeMode) {
    finalStatus = 'practice';
    correctScore = gameResult.calculatedScore !== undefined ? gameResult.calculatedScore : 0;
  } else {
    // 로컬에 저장된 라운드별 정답 여부로 승패 계산
    let myCorrectCount = 0;
    let opponentCorrectCount = 0;
    
    // 내 정답 개수 계산 (로컬 저장 데이터에서)
    Object.keys(storedBattleAnswers).forEach((roundKey) => {
      const entry = storedBattleAnswers[roundKey];
      if (entry && typeof entry.isCorrect === 'boolean' && entry.isCorrect === true) {
        myCorrectCount++;
      }
    });
    
    // 내 playerId 찾기 (로컬 저장 또는 API 응답에서)
    let myPlayerId = localPlayerId;
    if (!myPlayerId && Array.isArray(roundDetails) && roundDetails.length > 0) {
      // 첫 번째 라운드에서 내 플레이어 찾기 시도
      const firstRound = roundDetails[0];
      if (Array.isArray(firstRound?.players) && firstRound.players.length > 0) {
        // 호스트인 경우 isHost로 찾기
        const hostPlayer = firstRound.players.find((p) => p?.isHost === true);
        if (hostPlayer) {
          myPlayerId = hostPlayer.playerId ?? hostPlayer.id ?? hostPlayer.guestId ?? hostPlayer.userId ?? null;
        } else {
          // 호스트가 아니면 첫 번째 플레이어 사용
          const firstPlayer = firstRound.players[0];
          myPlayerId = firstPlayer?.playerId ?? firstPlayer?.id ?? firstPlayer?.guestId ?? firstPlayer?.userId ?? null;
        }
      }
    }
    
    // 상대방 정답 개수 계산 (API 응답의 rounds에서)
    if (Array.isArray(roundDetails)) {
      roundDetails.forEach((roundDetail) => {
        const roundNumber = typeof roundDetail?.round === 'number' ? roundDetail.round : null;
        
        // winner 필드로 승패 판정 (가장 정확)
        if (roundDetail?.winner) {
          const winnerId = 
            typeof roundDetail.winner === 'string' 
              ? roundDetail.winner 
              : roundDetail.winner?.playerId ?? roundDetail.winner?.id ?? null;
          
          // winner가 나와 다르면 상대방이 이긴 것
          if (winnerId && winnerId !== myPlayerId) {
            opponentCorrectCount++;
          }
        } else if (Array.isArray(roundDetail?.players)) {
          // players 배열에서 상대방 찾기
          const opponentPlayer = roundDetail.players.find(
            (player) => {
              const playerId = player?.playerId ?? player?.id ?? player?.guestId ?? player?.userId ?? null;
              return playerId && playerId !== myPlayerId;
            },
          );
          if (opponentPlayer) {
            const isOpponentCorrect =
              typeof opponentPlayer.isCorrect === 'boolean'
                ? opponentPlayer.isCorrect
                : normalizeResultFlag(opponentPlayer?.result ?? opponentPlayer?.status) === 'correct' ||
                  normalizeResultFlag(opponentPlayer?.result ?? opponentPlayer?.status) === 'win';
            if (isOpponentCorrect) {
              opponentCorrectCount++;
            }
          }
        }
      });
    }
    
    correctScore = myCorrectCount;
    
    // 승패 판정
    if (myCorrectCount > opponentCorrectCount) {
      finalStatus = 'win';
    } else if (myCorrectCount < opponentCorrectCount) {
      finalStatus = 'lose';
    } else {
      finalStatus = 'tie';
    }
  }
  
  const totalRounds = roundDetails.length;

  const currentRoundDetail = roundDetails[currentRoundIndex];

  const { text: userInput, isCorrect } = isPracticeMode
    ? derivePracticeAnswerInfo(currentRoundDetail)
    : deriveBattleAnswerInfo(
      currentRoundDetail,
      localPlayerId,
      storedBattleAnswers,
      currentRoundIndex + 1,
    );

  const correctAnswer = resolveCorrectAnswer(currentRoundDetail);
  const standardRule = resolveExplanation(currentRoundDetail);

  if (!currentRoundDetail) {
    return <div id="Result_wrap">결과에 라운드 상세 정보가 없습니다.</div>;
  }

  const gameData = {
    'lose': {
      title: "패배", // 배틀 패배 시
      lionMessage: "아쉬워요 어흥... 연습하고 한번 더?",
      showPracticeButton: true,
    },
    'win': {
      title: "승리", // 배틀 승리 시
      lionMessage: "잘했어요 어흥!",
      showPracticeButton: true,
    },
    'tie': {
      title: "무승부", // 배틀 무승부 시
      lionMessage: "아쉬워요 어흥... 연습하고 한번 더?",
      showPracticeButton: true,
    },
    'practice': {
      // isPracticeMode가 true일 때만 '정답 X/Y' 타이틀을 사용하도록 수정
      title: isPracticeMode ? `정답 ${correctScore}/${totalRounds}` : "잘했어요 어흥!",
      lionMessage: isPracticeMode ? "잘했어요 어흥! 실력 향상을 위해 다시 한번 도전해봐요!" : "잘했어요 어흥!",
      showPracticeButton: true,
    }
  };

  const currentData = gameData[finalStatus] || gameData.practice;

  const resolvedRoundNumber =
    typeof currentRoundDetail.round === 'number' && currentRoundDetail.round > 0
      ? currentRoundDetail.round
      : currentRoundIndex + 1;

  const roundData = {
    round: `ROUND ${resolvedRoundNumber}`,
    userInput,
    isCorrect,
    correctAnswer,
    standardRule,
  };

  const handleRoundChange = (direction) => {
    setCurrentRoundIndex(prevIndex => {
      if (direction === 'next' && prevIndex < totalRounds - 1) {
        return prevIndex + 1;
      }
      if (direction === 'prev' && prevIndex > 0) {
        return prevIndex - 1;
      }
      return prevIndex;
    });
  };

  // 카카오톡 공유 로직
  const handleShareResult = () => {
    if (isPracticeMode) {
      return;
    }

    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 SDK 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // 공유 카드에 표시할 이미지 URL을 승패에 따라 다르게 설정합니다.
    const WIN_URL = 'https://hyunseoko.store/share_images/win.png';
    const LOSE_URL = 'https://hyunseoko.store/share_images/lose.png';
    const TIE_URL = 'https://hyunseoko.store/share_images/tie.png';

    let shareImageUrl;

    if (finalStatus === 'win') {
      shareImageUrl = WIN_URL;
    } else if (finalStatus === 'tie') { // 무승부 로직 추가
      shareImageUrl = TIE_URL;
    } else { // lose
      shareImageUrl = LOSE_URL;
    }

    // 공유 메시지 텍스트도 무승부를 고려해 수정
    const shareStatusText =
      finalStatus === 'win' ? '최종 승리' :
        finalStatus === 'tie' ? '무승부' : '최종 패배';

    const shareTitle = `[한글 대왕] 나의 결과는 ${shareStatusText}입니다!`;
    const shareDescription = currentData.lionMessage;

    // 현재 결과 페이지 URL 생성
    const resultPath = `/`;
    const shareLink = `${window.location.origin}${resultPath}?t=${Date.now()}`;

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: shareTitle,
        description: shareDescription,
        imageUrl: shareImageUrl, // 동적으로 결정된 이미지 URL 사용
        link: {
          mobileWebUrl: shareLink,
          webUrl: shareLink,
        },
      },
      buttons: [
        {
          title: '나도 한번..?',
          link: {
            mobileWebUrl: shareLink,
            webUrl: shareLink,
          },
        },
      ],
      installTalk: true,
    });
  };

  return (
    <div id="Result_wrap">
      <div className="title">
        <p>게임결과</p>
        <h1 className={finalStatus}>{currentData.title}</h1>
      </div>
      <main>
        <div className="lion">
          <LionComment
            message={currentData.lionMessage}
            gameState={finalStatus}
          />
        </div>
        <div className="round_button">
          <button className="left"
            onClick={() => handleRoundChange('prev')}
            disabled={currentRoundIndex === 0}>
            <img src={left_icon} alt="이전 라운드" />
          </button>
          <ResultCard data={{ ...roundData, round: `ROUND ${currentRoundIndex + 1} / ${totalRounds}` }} />
          <button className="right"
            onClick={() => handleRoundChange('next')}
            disabled={currentRoundIndex === totalRounds - 1}>
            <img src={right_icon} alt="다음 라운드" />
          </button>
        </div>
      </main>
      <div className="btn">
        <Link to='/'>
          <button className="home">
            홈으로 돌아가기
          </button>
        </Link>

        {isPracticeMode && currentData.showPracticeButton && (
          <Link to='https://primary.ebs.co.kr/course/grade/list?page=1&sortSequence=5&lvlCd=&viewType=normal&clsfsSysId=21000011&orderClsfsSysId=21000015&sch_check=&searchKeyword=&seriesId='>
            <button className="practice">
              EBS에서 더 공부하기
            </button>
          </Link>
        )}

        {!isPracticeMode && (
          <button
            className="share"
            onClick={handleShareResult}
          >
            결과 공유하기
          </button>
        )}
      </div>
    </div>
  )
}

export default Result;