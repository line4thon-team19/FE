/**
 * Battle API Service
 */

import { request } from '../utils/api/client.js';
import { createBattleRoomResponse, startBattleRoomResponse, entryBattleRoomResponse, submitAnswerResponse, getBattleResultResponse } from '../mock/data/battle.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || false;

/**
 * 배틀룸 생성
 * POST /api/battle/rooms
 * @param {object} data - 배틀룸 생성 요청 데이터
 * @returns {Promise<object>} 배틀룸 생성 응답
 */
export async function createBattleRoom(data = {}) {
  if (USE_MOCK) {
    // Mock 모드일 때는 mock 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...createBattleRoomResponse,
          // 요청 데이터가 있으면 일부 필드 업데이트
          ...(data.roomCode && { roomCode: data.roomCode }),
          ...(data.hostId && { hostId: data.hostId }),
        });
      }, 500);
    });
  }

  // 실제 API 호출
  return request('/battle/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 배틀룸 시작
 * POST /api/battle/{sessionId}/start
 * @param {string} sessionId - 배틀룸 세션 ID
 * @param {object} data - 배틀룸 시작 요청 데이터 (countdownSec 포함)
 * @returns {Promise<object>} 배틀룸 시작 응답
 */
export async function startBattleRoom(sessionId, data = {}) {
  if (USE_MOCK) {
    // Mock 모드일 때는 mock 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...startBattleRoomResponse,
          // 요청 데이터의 countdownSec 반영
          ...(data.countdownSec && { 
            countdown: { seconds: data.countdownSec } 
          }),
        });
      }, 500);
    });
  }

  // 실제 API 호출
  return request(`/battle/${sessionId}/start`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 배틀룸 입장
 * POST /api/battle/entry
 * @param {object} data - 배틀룸 입장 요청 데이터 (roomCode 포함)
 * @returns {Promise<object>} 배틀룸 입장 응답
 */
export async function entryBattleRoom(data) {
  if (USE_MOCK) {
    // Mock 모드일 때는 mock 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...entryBattleRoomResponse,
          // 요청 데이터의 roomCode 반영
          ...(data.roomCode && { roomCode: data.roomCode }),
        });
      }, 500);
    });
  }

  // 실제 API 호출
  return request('/battle/entry', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 배틀룸 정답 제출
 * POST /api/battle/{sessionId}/answer
 * @param {string} sessionId - 배틀룸 세션 ID
 * @param {object} data - 정답 제출 데이터 (round, answer)
 * @returns {Promise<object>} 정답 제출 응답
 */
export async function submitAnswer(sessionId, data) {
  if (USE_MOCK) {
    // Mock 모드일 때는 mock 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...submitAnswerResponse,
          round: data.round,
        });
      }, 500);
    });
  }

  // 실제 API 호출
  return request(`/battle/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 배틀룸 결과 조회
 * GET /api/battle/{sessionId}/result
 * @param {string} sessionId - 배틀룸 세션 ID
 * @returns {Promise<object>} 배틀룸 결과 응답
 */
export async function getBattleResult(sessionId) {
  if (USE_MOCK) {
    // Mock 모드일 때는 mock 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...getBattleResultResponse,
        });
      }, 500);
    });
  }

  // 실제 API 호출
  return request(`/battle/${sessionId}/result`, {
    method: 'GET',
  });
}

