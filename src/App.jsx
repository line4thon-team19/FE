import { useState } from 'react'
import './App.css'
import PracticeGame from './components/Practice'

export default function App() {
  const handleGoHome = () => {
    alert("홈으로 돌아가기(라우팅 연결 예정)");
  };
  return <PracticeGame onGoHome={handleGoHome} />;
}
