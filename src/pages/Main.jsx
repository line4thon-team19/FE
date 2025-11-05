import React from 'react'
import lion_icon from '../assets/images/lion.svg'
const App = () => {
  return (
    <div id="Main_wrap">
      <div className="title">
        <img src={lion_icon} alt="" />
        <div className="text">
          <p>받아쓰기 배틀</p>
          <h1>한글 대왕</h1>
        </div>
        <img src={lion_icon} alt="" />
      </div>
      <div className='btn'>
        <button className="practice_btn">
          연습하기
        </button>
        <button className="battle_btn">
          배틀하기
        </button>
      </div>
    </div>
  )
}

export default App