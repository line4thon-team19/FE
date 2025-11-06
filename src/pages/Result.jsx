import React from 'react'
import { useState } from 'react'
import ResultCard from '../components/ResultCard'
import LionComment from '../components/LionComment'
import { Link } from 'react-router-dom'
import right_icon from '../assets/images/right.svg'
import left_icon from '../assets/images/left.svg'

const Result = () => {
  const [gameState,setGameState]=useState('lose')

  const gameData = {
    'lose': {
      title: "패배",
      lionMessage: "아쉬워요 어흥...",
      showPracticeButton: true,
    },
    'win': {
      title: "승리",
      lionMessage: "잘했어요 어흥!",
      showPracticeButton: true,
    },
    'practice': { 
      title: "정답 3/5",
      lionMessage: "잘했어요 어흥!",
      showPracticeButton: false, 
    }
  };

  const currentData = gameData[gameState];

  const roundData = {
      round: 'ROUND 1',
      userInput: '가격이 넘어무 올랐다.',
      isCorrect: false, // X 또는 O 표시를 위한 상태
      correctAnswer: '가격이 너무 올랐다.',
      standardRule: "표준어는 '너무'입니다.",
  };

  return (
    <div id="Result_wrap">
      <div className="title">
        <p>게임 결과</p>
        <h1 className={gameState}>{currentData.title}</h1>
      </div>
      <div className="lion">
        <LionComment message={currentData.lionMessage}
        gameState={gameState}/>
      </div>
      <main>
        <button className="left">
          <img src={left_icon} alt="" />
        </button>
        <ResultCard data={roundData}/>
        <button className="right">
          <img src={right_icon} alt="" />
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

export default Result