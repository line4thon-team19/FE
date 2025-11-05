import React from 'react'
import ResultCard from '../components/ResultCard'
import LionComment from '../components/LionComment'
import { Link } from 'react-router-dom'

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
        <ResultCard/>
      </main>
      <div className="btn">
        <button className="pratice">
          연습하러 가기
        </button>
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