import axios, {AxiosError} from 'axios';

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'conflict'
  | 'rateLimited'
  | 'server'
  | 'cancelled'
  | 'unknown';

/**
 * Lỗi chuẩn hoá của tầng API.
 *
 * Vì sao không ném thẳng AxiosError lên UI: UI sẽ phải biết `error.response?.status`,
 * `error.code === 'ECONNABORTED'`, phân biệt `ERR_NETWORK` với timeout… Mỗi màn
 * hình tự đoán một kiểu và sẽ đoán khác nhau. Gom về đây một lần.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** Mã lỗi nghiệp vụ do backend trả (nếu có), ví dụ "SEPAY_ORDER_EXPIRED". */
  readonly code: string | null;
  /** i18n key để hiện cho người dùng. */
  readonly i18nKey: string;
  /** Lỗi validate theo field, dùng để bơm vào react-hook-form. */
  readonly fieldErrors: Record<string, string> | null;
  readonly raw: unknown;

  constructor(init: {
    kind: ApiErrorKind;
    status: number | null;
    code?: string | null;
    message: string;
    i18nKey: string;
    fieldErrors?: Record<string, string> | null;
    raw?: unknown;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code ?? null;
    this.i18nKey = init.i18nKey;
    this.fieldErrors = init.fieldErrors ?? null;
    this.raw = init.raw;
  }

  /** 401 đã được interceptor thử refresh; tới đây nghĩa là refresh cũng hỏng. */
  get isSessionExpired(): boolean {
    return this.kind === 'unauthorized';
  }

  /** Đáng thử lại không — dùng cho `retry` của TanStack Query. */
  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server';
  }
}

type BackendErrorBody = {
  code?: string;
  message?: string;
  errors?: Record<string, string | string[]>;
};

function normalizeFieldErrors(
  errors: BackendErrorBody['errors'],
): Record<string, string> | null {
  if (!errors) {return null;}
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(errors)) {
    out[field] = Array.isArray(value) ? value[0] : value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {return error;}

  if (axios.isCancel(error)) {
    return new ApiError({
      kind: 'cancelled',
      status: null,
      message: 'Request bị huỷ',
      i18nKey: 'error.unknown',
      raw: error,
    });
  }

  if (axios.isAxiosError(error)) {
    return fromAxiosError(error);
  }

  return new ApiError({
    kind: 'unknown',
    status: null,
    message: error instanceof Error ? error.message : String(error),
    i18nKey: 'error.unknown',
    raw: error,
  });
}

function fromAxiosError(error: AxiosError<BackendErrorBody>): ApiError {
  const body = error.response?.data;
  const code = body?.code ?? null;
  const serverMessage = body?.message;

  if (!error.response) {
    // Không có response = hoặc timeout, hoặc không nối được tới máy chủ.
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return new ApiError({
      kind: isTimeout ? 'timeout' : 'network',
      status: null,
      code,
      message: error.message,
      i18nKey: isTimeout ? 'error.timeout' : 'error.network',
      raw: error,
    });
  }

  const status: number = error.response.status;

  const map: Record<number, {kind: ApiErrorKind; i18nKey: string}> = {
    400: {kind: 'validation', i18nKey: 'error.unknown'},
    401: {kind: 'unauthorized', i18nKey: 'error.unauthorized'},
    403: {kind: 'forbidden', i18nKey: 'error.forbidden'},
    404: {kind: 'notFound', i18nKey: 'error.notFound'},
    409: {kind: 'conflict', i18nKey: 'error.unknown'},
    422: {kind: 'validation', i18nKey: 'error.unknown'},
    429: {kind: 'rateLimited', i18nKey: 'error.server'},
  };

  const mapped =
    map[status] ?? (status >= 500 ? {kind: 'server' as ApiErrorKind, i18nKey: 'error.server'} : null);

  return new ApiError({
    kind: mapped?.kind ?? 'unknown',
    status,
    code,
    // Ưu tiên message của backend: nó cụ thể hơn mọi chuỗi chung chung ta viết ra.
    message: serverMessage ?? error.message,
    i18nKey: mapped?.i18nKey ?? 'error.unknown',
    fieldErrors: normalizeFieldErrors(body?.errors),
    raw: error,
  });
}
