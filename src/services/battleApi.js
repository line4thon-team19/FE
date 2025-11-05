/**
 * Battle API Service
 */

import { request } from '../utils/api/client.js';
import { createBattleRoomResponse, startBattleRoomResponse, entryBattleRoomResponse, submitAnswerResponse, getBattleResultResponse } from '../mock/data/battle.js';

// 기본값을 mock으로 설정 (개발 환경에서는 mock 사용)
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

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
    // Mock 모드일 때는 mock 데이터 반환하고 localStorage에 저장
    return new Promise((resolve) => {
      setTimeout(() => {
        const roomCode = data.roomCode;
        const storageKey = `battle_room_${roomCode}`;
        
        // 기존 데이터 가져오기
        const existingData = localStorage.getItem(storageKey);
        let players = [{ playerId: "plr_host", isHost: true }];
        
        if (existingData) {
          const roomData = JSON.parse(existingData);
          players = roomData.players || players;
        }
        
        // 게스트 플레이어 추가 (중복 방지)
        const guestExists = players.some(p => p.playerId === "plr_guest");
        if (!guestExists) {
          players.push({ playerId: "plr_guest", isHost: false });
        }
        
        // localStorage에 저장
        localStorage.setItem(storageKey, JSON.stringify({ players }));
        
        resolve({
          ...entryBattleRoomResponse,
          roomCode,
          players,
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
 * 배틀룸 상태 조회 (임시 - 실제 API 엔드포인트 확인 필요)
 * GET /api/battle/{sessionId} 또는 roomCode로 조회
 * @param {string} roomCode - 배틀룸 코드
 * @returns {Promise<object>} 배틀룸 상태 응답
 */
export async function getBattleRoomStatus(roomCode) {
  if (USE_MOCK) {
    // Mock 모드일 때는 localStorage에서 입장 상태 확인
    return new Promise((resolve) => {
      setTimeout(() => {
        const storageKey = `battle_room_${roomCode}`;
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
          const roomData = JSON.parse(storedData);
          resolve({
            ...entryBattleRoomResponse,
            roomCode,
            players: roomData.players || [{ playerId: "plr_host", isHost: true }],
          });
        } else {
          // 아직 입장한 플레이어가 없음
          resolve({
            ...entryBattleRoomResponse,
            roomCode,
            players: [{ playerId: "plr_host", isHost: true }],
          });
        }
      }, 500);
    });
  }

  // 실제 API 호출 (임시로 entry API를 사용, 실제 엔드포인트가 있으면 수정 필요)
  // TODO: 실제 배틀룸 상태 조회 API 엔드포인트로 변경
  try {
    const response = await entryBattleRoom({ roomCode });
    return response;
  } catch (error) {
    console.error('배틀룸 상태 조회 실패:', error);
    throw error;
  }
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

