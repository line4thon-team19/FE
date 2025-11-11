import React from 'react'
import axios from 'axios';
import lion_icon from '../assets/lion.svg'
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HEALTH_API_URL= 'https://hyunseoko.store/api/health';
const GUEST_API_URL = 'https://hyunseoko.store/api/guest';

const Main = () => { 
  // GET api 관련 상태
  const [healthLoading, setHealthLoading] = useState(false); 
  const [healthData, setHealthData] = useState(null); 
  const [healthError, setHealthError] = useState(null); 

  //POST api 관련 상태
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestData, setGuestData] = useState(null); 
  const [guestError, setGuestError] = useState(null); 

  const [isGuestTokenReady, setIsGuestTokenReady] = useState(false);

  // Health API 호출
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

  // POST 게스트 토큰 발급
  const registerGuest = async () => {
    setGuestLoading(true);
    setGuestError(null);
    try {
      const response = await axios.post(GUEST_API_URL, {});
      
      // 
      const guestToken = response.data.token || 
                         response.data.guestToken || 
                         response.data.accessToken; 
      
      if (guestToken) {
        localStorage.setItem('authToken', guestToken);
        console.log("SUCCESS: Guest Token 발급 및 Local Storage에 'authToken'으로 저장 완료.");
        console.log("토큰 값 미리보기:", guestToken.substring(0, 15) + "..."); // 토큰 앞부분만 출력
        setIsGuestTokenReady(true);
      } else {

        console.warn("WARN: API 응답에 유효한 토큰(token, guestToken 등)이 포함되어 있지 않습니다. 키를 확인하세요.");
      }
      
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

  const isButtonDisabled = guestLoading || !isGuestTokenReady;

  return (
    <div id="Main_wrap">
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
        <Link to='/practice'>
          <button className="practice_btn">
            연습하기
          </button>
        </Link>
        <button className="battle_btn">
          배틀하기
        </button>
      </div>
    </div>
    </div>
  )
}

export default Main;