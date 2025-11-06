import React from 'react'
import axios from 'axios';
import lion_icon from '../assets/images/lion.svg'
import { useState, useEffect } from 'react';

const HEALTH_API_URL= 'https://hyunseoko.store/api/health';
const GUEST_API_URL = 'https://hyunseoko.store/api/guest';

const App = () => {
  // GET api 관련 상태
  const [healthLoading, setHealthLoading] = useState(false); 
  const [healthData, setHealthData] = useState(null); 
  const [healthError, setHealthError] = useState(null); 

  //POSt  api 관련 상태
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestData, setGuestData] = useState(null); 
  const [guestError, setGuestError] = useState(null); 

  // Health API 호출 함수
  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const response = await axios.get(HEALTH_API_URL);
      setHealthData(response.data);
      console.log("Health Check Success (GET):", response.data);
    } catch (err) {
      const errorMessage = `API Health Check (GET) 실패: ${err.message}`;
      setHealthError(errorMessage);
      console.error("API Health Check Error:", err);
    } finally {
      setHealthLoading(false);
    }
  }

  //POST 게스트 토큰 발급 함수
  const registerGuest = async () => {
    setGuestLoading(true);
    setGuestError(null);
    try {
      const response = await axios.post(GUEST_API_URL, {});
      setGuestData(response.data);
      console.log("Guest Registration Success (POST):", response.data);
    }catch (err){
      const errorMessage = `API Guest Registration (POST) 실패: ${err.message}`;
      setGuestError(errorMessage);  
      console.error("API Guest Registration Error:", err);
    }finally{
      setGuestLoading(false);
    }
  }

  
  useEffect(() => {
    fetchHealth();
    registerGuest();
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