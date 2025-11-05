import React from 'react'
import axios from 'axios';
import lion_icon from '../assets/images/lion.svg'
import { useState, useEffect } from 'react';

const API_URL= 'https://hyunseoko.store/api/health';

const App = () => {
  const[loading, setLoading]=useState(false);
  const[data, setDate]=useState(null);
  const[error,setError]=useState(null);

  const fetchHealth=async()=>{
    setLoading(true);
    setError(null);
    try{
      const response = await axios.get(API_URL);
      setDate(response.data);
      console.log(response.data);
    }catch (err){
      const errorMessage = `API 연결 실패: ${err.message}. 콘솔을 확인해주세요.`;
      setError(errorMessage);
      console.error("API Health Check Error:", err);
    }finally{
      setLoading(false);
    }
  }

  
  useEffect(() => {
    fetchHealth();
  }, []);

  

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