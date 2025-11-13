import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';

import Main from './pages/Main.jsx'
import Result from './pages/Result.jsx'
import PracticeGame from './components/Practice.jsx';
import EntryPage from './pages/EntryPage.jsx';
import BattleRoomPage from './pages/BattleRoomPage.jsx';

import './sass/Main.scss'
import './sass/practice.scss'

function BattleRoomRoute() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const roomCode = location.state?.roomCode ?? null;
  const role = location.state?.role ?? 'guest';

  return (
    <BattleRoomPage
      sessionId={sessionId}
      roomCode={roomCode}
      role={role}
    />
  );
}

function EntryPageRoute() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = location.state?.sessionId ?? null;

  return (
    <EntryPage
      roomCode={roomCode}
      sessionId={sessionId}
      onBack={() => navigate('/')}
      onReady={({ sessionId: readySessionId, roomCode: readyRoomCode }) =>
        navigate(`/battle/${readySessionId}`, {
          state: { roomCode: readyRoomCode, role: 'guest' },
        })
      }
    />
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Main />} />
      <Route path='/result/battle/:sessionId' element={<Result />} />
      <Route path='/result/practice/:practiceId' element={<Result />} />
      <Route path="/practice"
          element={<PracticeGame onGoHome={() => (window.location.href = "/")} />}/>
      <Route path='/battle/:sessionId' element={<BattleRoomRoute />} />
      <Route path='/join/:roomCode' element={<EntryPageRoute />} />
    </Routes>
    </BrowserRouter>
  </StrictMode>,
) 
