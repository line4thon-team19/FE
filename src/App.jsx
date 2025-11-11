import { useState, useEffect, useMemo } from 'react';
import StartPage from './pages/StartPage';
import EntryPage from './pages/EntryPage';
import BattleRoomPage from './pages/BattleRoomPage';
import './App.css';

function parseLocation() {
  const { pathname, search, hash } = window.location;
  const searchParams = new URLSearchParams(search);

  const sessionIdFromQuery = searchParams.get('sessionId');
  const roomCodeFromQuery = searchParams.get('roomCode');
  const roleFromQuery = searchParams.get('role');

  if (pathname.startsWith('/battle')) {
    return {
      page: 'battle',
      params: {
        sessionId: sessionIdFromQuery ?? null,
        roomCode: roomCodeFromQuery ?? null,
        role: roleFromQuery ?? 'guest',
      },
    };
  }

  let roomCode = null;
  let sessionId = sessionIdFromQuery ?? null;

  const joinPathMatch = pathname.match(/\/join\/([A-Za-z0-9]+)/);
  if (joinPathMatch) {
    roomCode = joinPathMatch[1];
  }

  if (roomCodeFromQuery) {
    roomCode = roomCodeFromQuery;
  }

  if (!sessionId) {
    const hashMatch = hash.match(/sessionId=([^&]+)/);
    if (hashMatch) {
      sessionId = decodeURIComponent(hashMatch[1]);
    }
  }

  if (roomCode || sessionId) {
    return {
      page: 'entry',
      params: {
        roomCode: roomCode ?? null,
        sessionId: sessionId ?? null,
      },
    };
  }

  return { page: 'start', params: {} };
}

function App() {
  const [route, setRoute] = useState(() => parseLocation());

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToBattle = ({ sessionId, roomCode, role }) => {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (roomCode) params.set('roomCode', roomCode);
    if (role) params.set('role', role);
    const nextUrl = `/battle?${params.toString()}`;
    window.history.pushState({}, '', nextUrl);
    setRoute({ page: 'battle', params: { sessionId, roomCode, role: role ?? 'guest' } });
  };

  const navigateToStart = () => {
    window.history.pushState({}, '', '/');
    setRoute({ page: 'start', params: {} });
  };

  const navigateToEntry = ({ sessionId, roomCode }) => {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    const path = roomCode ? `/join/${encodeURIComponent(roomCode)}` : '/join';
    const queryString = params.toString();
    const nextUrl = queryString ? `${path}?${queryString}` : path;
    window.history.pushState({}, '', nextUrl);
    setRoute({ page: 'entry', params: { sessionId, roomCode } });
  };

  const routeParams = useMemo(() => route.params ?? {}, [route]);

  if (route.page === 'battle') {
    if (!routeParams.sessionId) {
      return <div className="app-error">세션 정보가 없습니다. 초대를 다시 확인해 주세요.</div>;
    }
    return (
      <BattleRoomPage
        sessionId={routeParams.sessionId}
        roomCode={routeParams.roomCode}
        role={routeParams.role}
      />
    );
  }

  if (route.page === 'entry') {
    return (
      <EntryPage
        roomCode={routeParams.roomCode}
        sessionId={routeParams.sessionId}
        onBack={navigateToStart}
        onReady={(params) => navigateToBattle({ ...params, role: 'guest' })}
      />
    );
  }

  return <StartPage onNavigateBattle={navigateToBattle} />;
}

export default App;
