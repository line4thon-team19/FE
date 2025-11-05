import { useState, useEffect } from 'react';
import StartPage from './pages/StartPage';
import EntryPage from './pages/EntryPage';
import './App.css';

function App() {
  const [roomCode, setRoomCode] = useState(null);

  useEffect(() => {
    // URL에서 roomCode 추출
    // 예: https://app.example.com/join/A1B2C3 또는 ?roomCode=A1B2C3
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    // URL 경로에서 추출 (예: /join/A1B2C3)
    const pathMatch = pathname.match(/\/join\/([A-Z0-9]+)/);
    if (pathMatch) {
      setRoomCode(pathMatch[1]);
      return;
    }

    // 쿼리 파라미터에서 추출 (예: ?roomCode=A1B2C3)
    const queryRoomCode = searchParams.get('roomCode');
    if (queryRoomCode) {
      setRoomCode(queryRoomCode);
      return;
    }

    // inviteLink에서 roomCode 추출 (예: https://app.example.com/join/A1B2C3)
    const hashMatch = window.location.hash.match(/\/join\/([A-Z0-9]+)/);
    if (hashMatch) {
      setRoomCode(hashMatch[1]);
    }
  }, []);

  const handleBackToStart = () => {
    setRoomCode(null);
    window.history.pushState({}, '', '/');
  };

  if (roomCode) {
    return <EntryPage roomCode={roomCode} onBack={handleBackToStart} />;
  }

  return <StartPage />;
}

export default App;
