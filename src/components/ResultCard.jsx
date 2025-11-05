import React from 'react'

const ResultCard = () => {
  return (
    <div id="ResultCard_wrap">
        <div className="round">
            ROUND1
        </div>
        <div className="input_container">
            <div className="text">
                가격이 넘어무 올랐다.
            </div>
            <div className="icon">
                X
            </div>
        </div>
        <div className="answer_container">
            <p>정답</p>
            <div className="answer1">
                가격이 너무 올랐다.
            </div>
            <div className="answer2">
                표준어는 '너무'입니다.
            </div>
        </div>
    </div>
  )
}

export default ResultCard