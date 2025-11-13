/**
 * API Client 설정
 */

const rawBase = import.meta.env.VITE_API_BASE_URL ?? 'https://hyunseoko.store/api';
const normalisedBase = rawBase.replace(/\/$/, '');
const API_BASE_URL = normalisedBase.endsWith('/api') ? normalisedBase : `${normalisedBase}/api`;
// 기본값을 실 서버와 통신하도록 설정, 필요 시 VITE_USE_MOCK=true로 덮어쓰기
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/**
 * API 요청 함수
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - fetch 옵션
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const { skipAuth = false, ...fetchOptions } = options;

  const guestToken = typeof window !== 'undefined' ? sessionStorage.getItem('guestToken') : null;
  if (guestToken && !skipAuth) {
    console.debug('[API Client] guestToken 사용', guestToken);
  } else if (guestToken && skipAuth) {
    console.debug('[API Client] guestToken 존재하지만 skipAuth 옵션으로 헤더 제외');
  } else {
    console.debug('[API Client] guestToken 없음');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  const config = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultOptions.headers,
      ...fetchOptions.headers,
      ...(guestToken && !skipAuth ? { Authorization: `Bearer ${guestToken}` } : {}),
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * Mock API 요청 함수
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - fetch 옵션
 * @returns {Promise<any>}
 */
export async function mockApiRequest(endpoint, options = {}) {
  console.warn(`Mock API가 구현되지 않았습니다: ${endpoint}`, options);
  return Promise.resolve(null);
}

/**
 * API 요청 래퍼 (Mock/Real 선택)
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - fetch 옵션
 * @returns {Promise<any>}
 */
export async function request(endpoint, options = {}) {
  if (USE_MOCK) {
    return mockApiRequest(endpoint, options);
  }
  return apiRequest(endpoint, options);
}

