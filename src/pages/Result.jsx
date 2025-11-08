import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResultCard from '../components/ResultCard';
import LionComment from '../components/LionComment';
import { Link, useParams } from 'react-router-dom';
import right_icon from '../assets/images/right.svg';
import left_icon from '../assets/images/left.svg';

const BASE_URL = 'https://hyunseoko.store/api/battle';

const Result = () => {
  const { sessionId } = useParams(); 

  const [gameResult, setGameResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0); 

  useEffect(() => {
    if (!sessionId) {
      setError("세션 ID가 필요합니다. 올바른 경로로 접속했는지 확인해주세요.");
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      const token = localStorage.getItem('authToken'); 
      
      // 토큰 유효성 검사 및 401 에러 방지
      if (!token) {
        setError("인증 토큰이 없어 결과를 불러올 수 없습니다. 메인 페이지에서 토큰 발급을 확인하세요.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/${sessionId}/result`,{
          headers: {
            'Authorization': `Bearer ${token}`, 
            'Accept': 'application/json' 
          }
        });
        
        setGameResult(response.data);
        setLoading(false);
      } catch (err) {
        console.error("API 호출 오류:", err);
        
        if (err.response) {
            if (err.response.status === 401) {
                setError("인증에 실패했습니다. 토큰이 만료되었거나 유효하지 않습니다.");
            } else if (err.response.status === 404) {
                setError("해당 게임 세션을 찾을 수 없습니다.");
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
  }, [sessionId]); 

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
  
  if (!gameResult || !gameResult.rounds) {
    return <div id="Result_wrap">결과 데이터 구조가 올바르지 않습니다.</div>;
  }


  const finalStatus = gameResult.result; 
  const totalRounds = gameResult.rounds.length; 
  const correctScore = gameResult.summary.score;
  
  const currentRoundDetail = gameResult.rounds[currentRoundIndex]; 
  
  const gameData = {
    'lose': {
      title: "패배",
      lionMessage: "아쉬워요 어흥... 연습하고 한번 더?",
      showPracticeButton: true,
    },
    'win': {
      title: "승리",
      lionMessage: "잘했어요 어흥!",
      showPracticeButton: true,
    },
    'practice': { 
      title: `정답 ${correctScore}/${totalRounds}`,
      lionMessage: "잘했어요 어흥!",
      showPracticeButton: false, 
    }
  };
  
  const currentData = gameData[finalStatus] || gameData.practice; 
  
  const roundData = {
      round: `ROUND ${currentRoundDetail.round}`,
      userInput: currentRoundDetail.players.find(p => p.playerId === 'plr_host')?.answer || '입력 없음', 
      isCorrect: !currentRoundDetail.players.find(p => p.playerId === 'plr_host')?.incorrect, 
      correctAnswer: currentRoundDetail.answer, 
      standardRule: currentRoundDetail.comment, 
  };
  
  // 라운드 이동 핸들러
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
        <p>게임 결과</p>
        <h1 className={finalStatus}>{currentData.title}</h1>
      </div>
      <div className="lion">
        <LionComment 
            message={currentData.lionMessage}
            gameState={finalStatus}
        />
      </div>
      <main>
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
      </main>
      <div className="btn">
        {currentData.showPracticeButton &&(
          <button className="pratice">
          연습하러 가기
          </button>
        )}
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
