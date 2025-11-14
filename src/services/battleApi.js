/**
 * Battle API Service
 */

import { request } from '../utils/api/client.js';
import { API_ENDPOINTS } from '../constants/api.js';

function getGuestContext() {
  if (typeof window === 'undefined') return {};
  return {
    playerId: sessionStorage.getItem('guestPlayerId'),
    guestToken: sessionStorage.getItem('guestToken'),
  };
}

/**
 * 게스트 플레이어 생성
 * POST /api/guest
 * @returns {Promise<object>} 게스트 토큰 정보
 */
export async function createGuestPlayer() {
  console.debug('[BattleAPI] createGuestPlayer 요청 시작');
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('guestToken');
    sessionStorage.removeItem('guestTokenExpiresAt');
    sessionStorage.removeItem('guestPlayerId');
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenExpiresAt');
    } catch (storageError) {
      console.warn('[BattleAPI] localStorage authToken 초기화 실패', storageError);
    }
  }
  const response = await request(API_ENDPOINTS.AUTH.GUEST, {
    method: 'POST',
    skipAuth: true,
  });

  console.debug('[BattleAPI] createGuestPlayer 응답 playerId:', response?.playerId, 'expiresAt:', response?.expiresAt);

  if (response?.guestToken) {
    sessionStorage.setItem('guestToken', response.guestToken);
    sessionStorage.setItem('guestTokenExpiresAt', response.expiresAt ?? '');
    sessionStorage.setItem('guestPlayerId', response.playerId ?? '');
    try {
      localStorage.setItem('authToken', response.guestToken);
      if (response?.expiresAt) {
        localStorage.setItem('authTokenExpiresAt', response.expiresAt);
      }
    } catch (storageError) {
      console.warn('[BattleAPI] localStorage authToken 저장 실패', storageError);
    }
  }
  console.debug('[BattleAPI] 저장된 guestToken', sessionStorage.getItem('guestToken'));

  return response;
}

/**
 * 배틀룸 생성
 * POST /api/battle/rooms
 * @param {object} data - 배틀룸 생성 요청 데이터
 * @returns {Promise<object>} 배틀룸 생성 응답
 */
export async function createBattleRoom(data = {}) {
  const { playerId } = getGuestContext();
  const sanitized = {
    ...(playerId ? { hostId: playerId } : {}),
    ...data,
  };
  delete sanitized.state;
  delete sanitized.round;
  delete sanitized.status;

  console.debug('[BattleAPI] createBattleRoom 요청', sanitized);
  console.debug('[BattleAPI] createBattleRoom Authorization 토큰', sessionStorage.getItem('guestToken'));

  const options = {
    method: 'POST',
    ...(Object.keys(sanitized).length > 0
      ? { body: JSON.stringify(sanitized) }
      : {}),
  };

  const response = await request(API_ENDPOINTS.BATTLE.ROOMS, options);
  console.debug('[BattleAPI] createBattleRoom 응답', response);
  return response;
}

/**
 * 배틀룸 입장 요청
 * POST /api/battle/entry
 * @param {string} roomCode - 초대 코드
 * @returns {Promise<object>} 배틀룸 정보
 */
export async function enterBattleRoom(roomCode) {
  if (!roomCode) {
    throw new Error('roomCode가 필요합니다.');
  }
  console.debug('[BattleAPI] enterBattleRoom 요청', { roomCode });
  const response = await request(API_ENDPOINTS.BATTLE.ENTRY, {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });
  console.debug('[BattleAPI] enterBattleRoom 응답', response);
  return response;
}

/**
 * 배틀룸 시작
 * POST /api/battle/{sessionId}/start
 */
export async function startBattleRoom(sessionId, data = {}) {
  console.debug('[BattleAPI] startBattleRoom 요청', sessionId, data);
  const response = await request(API_ENDPOINTS.BATTLE.START(sessionId), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  console.debug('[BattleAPI] startBattleRoom 응답', response);
  return response;
}

/**
 * 배틀룸 정답 제출
 * POST /api/battle/{sessionId}/answer
 */
export async function submitAnswer(sessionId, data) {
  console.debug('[BattleAPI] submitAnswer 요청', sessionId, data);
  return request(API_ENDPOINTS.BATTLE.ANSWER(sessionId), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 배틀룸 결과 조회
 * GET /api/battle/{sessionId}/result
 */
export async function getBattleResult(sessionId) {
  console.debug('[BattleAPI] getBattleResult 요청', sessionId);
  return request(API_ENDPOINTS.BATTLE.RESULT(sessionId), {
    method: 'GET',
  });
}

/**
 * 배틀룸 현재 상태 조회
 * GET /api/battle/{sessionId}
 */
export async function getBattleSession(sessionId) {
  if (!sessionId) {
    throw new Error('sessionId가 필요합니다.');
  }
  console.debug('[BattleAPI] getBattleSession 요청', sessionId);
  return request(API_ENDPOINTS.BATTLE.DETAIL(sessionId), {
    method: 'GET',
  });
}

