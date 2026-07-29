import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {Platform} from 'react-native';
import {env, isVerboseLogging} from '../../config/env';
import {getAccessToken, refreshAccessToken} from './authTokens';
import {ApiError, toApiError} from './errors';

/** Cờ nội bộ gắn vào config để không refresh lặp vô hạn. */
type RetriableConfig = InternalAxiosRequestConfig & {
  _retriedAfterRefresh?: boolean;
  /** Bỏ qua interceptor gắn Authorization (dùng cho endpoint public). */
  skipAuth?: boolean;
  _startedAt?: number;
};

/**
 * Callback khi phiên hết hạn thật sự (refresh cũng hỏng).
 *
 * Không import store trực tiếp ở đây — làm vậy tạo import vòng
 * store → saga → service → client → store. Thay vào đó store tự đăng ký lúc
 * khởi tạo (xem store/index.ts).
 */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export const httpClient: AxiosInstance = axios.create({
  // env.apiBaseUrl = https://dev.hrapi.ttmedic.vn (cổng 443 mặc định của https)
  baseURL: `${env.apiBaseUrl}/api/v1`,
  timeout: env.apiTimeoutMs,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    // Backend cần biết client nào gọi để phân biệt log giữa 3 flavor.
    'X-Client-Platform': Platform.OS,
    'X-Client-Version': env.build.version,
    'X-Client-Build': String(env.build.number),
    'X-Client-Env': env.flavor,
  },
});

// ─── Request: gắn token + trace ──────────────────────────────────────────────

httpClient.interceptors.request.use(async config => {
  const typed = config as RetriableConfig;
  typed._startedAt = Date.now();

  if (!typed.skipAuth) {
    const token = await getAccessToken();
    if (token) {
      typed.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (isVerboseLogging) {
    console.log(`→ ${typed.method?.toUpperCase()} ${typed.url}`);
  }

  return typed;
});

// ─── Response: refresh 1 lần khi 401, rồi chuẩn hoá lỗi ──────────────────────

httpClient.interceptors.response.use(
  response => {
    if (isVerboseLogging) {
      const config = response.config as RetriableConfig;
      const ms = config._startedAt ? Date.now() - config._startedAt : 0;
      console.log(`← ${response.status} ${config.url} (${ms}ms)`);
    }
    return response;
  },
  async error => {
    const config = error?.config as RetriableConfig | undefined;
    const status = error?.response?.status;

    // 401 + chưa thử refresh cho request này -> refresh MỘT lần rồi gọi lại.
    // `refreshAccessToken` là single-flight: 10 request cùng 401 chỉ tạo 1 lần
    // refresh, tránh làm rotate token hỏng phiên (xem authTokens.ts).
    if (status === 401 && config && !config._retriedAfterRefresh && !config.skipAuth) {
      config._retriedAfterRefresh = true;

      const freshToken = await refreshAccessToken();
      if (freshToken) {
        config.headers.set('Authorization', `Bearer ${freshToken}`);
        return httpClient.request(config);
      }

      // Refresh hỏng = phiên chết thật. Báo một lần cho store xử lý logout.
      onSessionExpired?.();
    }

    return Promise.reject(toApiError(error));
  },
);

// ─── Helper gọn cho service layer ────────────────────────────────────────────

export type RequestOptions = AxiosRequestConfig & {skipAuth?: boolean};

export const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    httpClient.get<T>(url, options).then(r => r.data),

  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    httpClient.post<T>(url, body, options).then(r => r.data),

  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    httpClient.put<T>(url, body, options).then(r => r.data),

  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    httpClient.patch<T>(url, body, options).then(r => r.data),

  delete: <T>(url: string, options?: RequestOptions) =>
    httpClient.delete<T>(url, options).then(r => r.data),
};

export {ApiError};
