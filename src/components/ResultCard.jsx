import React, { use } from 'react'

const ResultCard = ( {data} ) => {
    const { round, userInput, isCorrect, correctAnswer, standardRule } = data;
    const iconSymbol = isCorrect ? 'O' : 'X';
  return (
    <div id="ResultCard_wrap">
        <div className="round">
            {round}
        </div>
        <div className="input_container">
            <div className="text">
                {userInput}
            </div>
            <div className="icon">
                {iconSymbol}
            </div>
        </div>
        <div className="answer_container">
            <p>정답</p>
            <div className="answer1">
                {correctAnswer}
            </div>
            <div className="answer2">
                {standardRule}
            </div>
        </div>
    </div>
  )
}

export default ResultCard