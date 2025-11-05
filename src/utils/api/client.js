/**
 * API Client 설정
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hyunseoko.store/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || false;

/**
 * API 요청 함수
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - fetch 옵션
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
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
  // Mock API 로직은 mock 서버나 직접 데이터 반환
  // 개발 중에는 mock 데이터를 직접 반환
  return new Promise((resolve) => {
    setTimeout(() => {
      // 실제로는 mock 서버나 mock 핸들러에서 처리
      resolve(null);
    }, 300);
  });
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

