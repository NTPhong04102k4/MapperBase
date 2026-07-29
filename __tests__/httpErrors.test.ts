import {AxiosError, AxiosHeaders} from 'axios';
import {ApiError, toApiError} from '@/shared/services/http/errors';

function axiosErrorWithStatus(status: number, data?: unknown): AxiosError {
  const config = {headers: new AxiosHeaders()} as never;
  const error = new AxiosError('request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  } as never);
  return error;
}

describe('toApiError', () => {
  it('map 401 sang unauthorized + đánh dấu phiên hết hạn', () => {
    const error = toApiError(axiosErrorWithStatus(401));
    expect(error.kind).toBe('unauthorized');
    expect(error.isSessionExpired).toBe(true);
    expect(error.i18nKey).toBe('error.unauthorized');
  });

  it('map 5xx sang server và coi là đáng retry', () => {
    const error = toApiError(axiosErrorWithStatus(503));
    expect(error.kind).toBe('server');
    expect(error.isRetryable).toBe(true);
  });

  it('KHÔNG retry lỗi 4xx — gửi lại cũng nhận đúng lỗi đó', () => {
    expect(toApiError(axiosErrorWithStatus(403)).isRetryable).toBe(false);
    expect(toApiError(axiosErrorWithStatus(404)).isRetryable).toBe(false);
    expect(toApiError(axiosErrorWithStatus(422)).isRetryable).toBe(false);
  });

  it('phân biệt timeout với mất mạng — hai thông báo khác nhau cho người dùng', () => {
    const config = {headers: new AxiosHeaders()} as never;

    const timeout = toApiError(new AxiosError('timeout', 'ECONNABORTED', config));
    expect(timeout.kind).toBe('timeout');
    expect(timeout.i18nKey).toBe('error.timeout');

    const offline = toApiError(new AxiosError('network', 'ERR_NETWORK', config));
    expect(offline.kind).toBe('network');
    expect(offline.i18nKey).toBe('error.network');
  });

  it('ưu tiên message của backend vì nó cụ thể hơn chuỗi chung chung của ta', () => {
    const error = toApiError(
      axiosErrorWithStatus(400, {code: 'SEPAY_ORDER_EXPIRED', message: 'Đơn đã hết hạn'}),
    );
    expect(error.message).toBe('Đơn đã hết hạn');
    expect(error.code).toBe('SEPAY_ORDER_EXPIRED');
  });

  it('gom lỗi theo field để bơm thẳng vào react-hook-form', () => {
    const error = toApiError(
      axiosErrorWithStatus(422, {errors: {amount: ['Số tiền không hợp lệ'], orderRef: 'Trùng mã'}}),
    );
    expect(error.fieldErrors).toEqual({
      amount: 'Số tiền không hợp lệ',
      orderRef: 'Trùng mã',
    });
  });

  it('không bọc lại ApiError đã chuẩn hoá', () => {
    const original = new ApiError({
      kind: 'forbidden',
      status: null,
      message: 'x',
      i18nKey: 'permission.denied',
    });
    expect(toApiError(original)).toBe(original);
  });
});
