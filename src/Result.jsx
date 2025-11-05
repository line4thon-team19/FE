import React from 'react'
import ResultRow from './components/ResultRow'
import LionComment from './components/LionComment'
import lion_icon from './assets/images/lion.svg'
import sad_lion_icon from './assets/images/sad_lion.svg'

const Result = () => {
  return (
    <div id="Result_wrap">
      <div className="title">
        <p>게임 결과</p>
        <h1>패배</h1>
      </div>
      <div className="lion">
        <LionComment/>
      </div>
      <main>
        <ResultRow/>
        <ResultRow/>
        <ResultRow/>
        <ResultRow/>
        <ResultRow/>
      </main>
      <div className="btn">
        <button className="pratice">
          연습하러 가기
        </button>
        <button className="home">
          홈으로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default Result