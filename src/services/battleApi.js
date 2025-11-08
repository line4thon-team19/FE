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
  const response = await request(API_ENDPOINTS.AUTH.GUEST, {
    method: 'POST',
  });

  console.debug('[BattleAPI] createGuestPlayer 응답 playerId:', response?.playerId, 'expiresAt:', response?.expiresAt);

  if (response?.guestToken) {
    sessionStorage.setItem('guestToken', response.guestToken);
    sessionStorage.setItem('guestTokenExpiresAt', response.expiresAt ?? '');
    sessionStorage.setItem('guestPlayerId', response.playerId ?? '');
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
 * 배틀룸 시작
 * POST /api/battle/{sessionId}/start
 */
export async function startBattleRoom(sessionId, data = {}) {
  console.debug('[BattleAPI] startBattleRoom 요청', sessionId, data);
  return request(API_ENDPOINTS.BATTLE.START(sessionId), {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

