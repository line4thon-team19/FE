import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResultCard from '../components/ResultCard';
import LionComment from '../components/LionComment';
import { Link, useParams, useLocation } from 'react-router-dom'; 
import right_icon from '../assets/images/right.svg';
import left_icon from '../assets/images/left.svg'

const BASE_URL_DOMAIN = 'https://hyunseoko.store'; 

const Result = () => {
  const { sessionId, practiceId } = useParams(); 
  const location = useLocation(); 

  const [gameResult, setGameResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0); 

  const isPracticeMode = location.pathname.includes('/practice/');
  const currentId = isPracticeMode ? practiceId : sessionId; 

  useEffect(() => {
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
        
        // ✨ 연습 모드일 경우 스코어를 직접 계산하여 결과 객체에 추가
        if (isPracticeMode && response.data.questions) {
            const correctCount = response.data.questions.filter(q => q.result === 'correct').length;
            response.data.calculatedScore = correctCount; // 계산된 스코어를 새로운 필드로 추가
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
  }, [currentId, isPracticeMode]); 


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
  
  // ✨ 스코어 계산 로직 수정
  const correctScore = isPracticeMode 
    ? (gameResult.calculatedScore !== undefined ? gameResult.calculatedScore : 0) // 연습 모드: 계산된 스코어 사용
    : (gameResult.summary && gameResult.summary.score !== undefined ? gameResult.summary.score : 0); // 배틀 모드: summary.score 사용
  
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
          <ResultCard data={{...roundData, round: `ROUND ${currentRoundIndex + 1} / ${totalRounds}`}}/>
        <button className="right" 
                onClick={() => handleRoundChange('next')}
                disabled={currentRoundIndex === totalRounds - 1}>
          <img src={right_icon} alt="다음 라운드" />
        </button>
        </div>
      </main>
      <div className="btn">
        <Link to='/practice'>
          {currentData.showPracticeButton &&(
            <button className="pratice">
            {isPracticeMode ? '다시 연습하기' : '연습하러 가기'}
            </button>
          )}
        </Link>
        <Link to='/'>
          <button className="home">
            홈으로 돌아가기
          </button>
        </Link>
      </div>
    </div>
  )
}

export default Result;