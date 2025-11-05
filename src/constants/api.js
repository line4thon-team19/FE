/**
 * API Constants
 */

// API 엔드포인트
export const API_ENDPOINTS = {
  BATTLE: {
    ROOMS: '/battle/rooms',
    ENTRY: '/battle/entry',
    START: (sessionId) => `/battle/${sessionId}/start`,
    ANSWER: (sessionId) => `/battle/${sessionId}/answer`,
    RESULT: (sessionId) => `/battle/${sessionId}/result`,
  },
};

// API 상태 코드
export const API_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
};

