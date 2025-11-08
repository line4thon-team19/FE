import { io } from 'socket.io-client';

const HTTP_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://hyunseoko.store').replace(/\/$/, '');

/**
 * 배틀 Socket.IO 연결을 생성합니다.
 * @param {string} sessionId - 배틀 세션 ID
 * @param {string} token - 게스트 토큰
 * @param {string} playerId - 플레이어 ID(선택)
 * @returns {import('socket.io-client').Socket}
 */
export function connectBattleSocket(sessionId, token, playerId) {
  if (!sessionId) {
    throw new Error('sessionId가 필요합니다.');
  }
  if (!token) {
    throw new Error('guestToken이 필요합니다.');
  }

  const safePlayerId = playerId && playerId.trim().length > 0 ? playerId.trim().slice(0, 40) : undefined;

  return io(HTTP_BASE, {
    path: '/ws',
    auth: {
      token,
      ...(safePlayerId ? { playerId: safePlayerId } : {}),
    },
    query: {
      sessionId,
    },
    transports: ['websocket', 'polling'],
    timeout: 5000,
    reconnectionAttempts: 3,
  });
}
