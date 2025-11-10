import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResultCard from '../components/ResultCard';
import LionComment from '../components/LionComment';
import { Link, useParams, useLocation } from 'react-router-dom';
import right_icon from '../assets/right.svg';
import left_icon from '../assets/left.svg'
import lion_win from '../assets/lion.svg'
import lion_lose from '../assets/sadlion.svg'

const BASE_URL_DOMAIN = 'https://hyunseoko.store';

const loadKakaoSDK = (appKey) => {
  // SDK가 이미 초기화되었는지 확인
  if (window.Kakao && window.Kakao.isInitialized()) {
    return;
  }

  // index.html에 스크립트를 추가했더라도, 여기서 다시 한번 초기화 시도
  if (window.Kakao) {
    try {
      window.Kakao.init(appKey);
      console.log("카카오 SDK 초기화 완료:", window.Kakao.isInitialized());
    } catch (e) {
      console.error("카카오 SDK 초기화 오류:", e);
    }
  } else {
    // SDK가 아직 로드되지 않은 경우 (index.html 설정이 안 되었을 때를 대비)
    console.warn("window.Kakao 객체를 찾을 수 없습니다. index.html의 스크립트 로드를 확인해주세요.");
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

  // 환경번수에서 앱키 불러오기
  const KAKAO_APP_KEY = (typeof process !== 'undefined' && process.env.REACT_APP_KAKAO_API_KEY)
    ? process.env.REACT_APP_KAKAO_API_KEY
    : 'YOUR_ACTUAL_KAKAO_APP_KEY';

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
        console.error("API 호출 오류:", err);

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


  const finalStatus = isPracticeMode ? 'practice' : (gameResult.result || 'practice');
  const totalRounds = roundDetails.length;

  const correctScore = isPracticeMode
    ? (gameResult.calculatedScore !== undefined ? gameResult.calculatedScore : 0)
    : (gameResult.summary && gameResult.summary.score !== undefined ? gameResult.summary.score : 0);

  const currentRoundDetail = roundDetails[currentRoundIndex];

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
    'practice': {
      // isPracticeMode가 true일 때만 '정답 X/Y' 타이틀을 사용하도록 수정
      title: isPracticeMode ? `정답 ${correctScore}/${totalRounds}` : "잘했어요 어흥!",
      lionMessage: isPracticeMode ? "잘했어요 어흥! 실력 향상을 위해 다시 한번 도전해봐요!" : "잘했어요 어흥!",
      showPracticeButton: true,
    }
  };

  const currentData = gameData[finalStatus] || gameData.practice;

  const roundData = {
    round: `ROUND ${currentRoundDetail.round}`,
    userInput: currentRoundDetail.answer || '입력 없음',
    isCorrect: currentRoundDetail.result === 'correct',
    correctAnswer: currentRoundDetail.correctAnswer,
    standardRule: currentRoundDetail.explanation,
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
      console.log("연습 모드에서는 공유 기능을 사용할 수 없습니다.");
      return;
    }

    if (!window.Kakao || !window.Kakao.isInitialized()) {
      alert('카카오 SDK 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // 공유 카드에 표시할 이미지 URL을 승패에 따라 다르게 설정합니다.
    const WIN_URL = 'https://raw.githubusercontent.com/line4thon-team19/FE/dev/public/share_images/lion_lose.svg';
    const LOSE_URL = 'https://raw.githubusercontent.com/line4thon-team19/FE/dev/public/share_images/lion_lose.svg';

    const shareImageUrl = finalStatus === 'win' ? WIN_URL : LOSE_URL;

    // 공유 메시지에 사용할 동적 데이터 구성
    const shareStatusText = finalStatus === 'win' ? '최종 승리' : '최종 패배';

    const shareTitle = `[한글 대왕] 나의 결과는 ${shareStatusText}입니다!`;
    const shareDescription = currentData.lionMessage;

    // 현재 결과 페이지 URL 생성
    const resultPath = `/battle/${sessionId}/result`;
    const shareLink = `${window.location.origin}${resultPath}`;

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
          title: '내 결과 보러가기',
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