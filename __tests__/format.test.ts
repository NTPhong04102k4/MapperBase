import {formatDuration, formatVnd, maskAccountNumber} from '@/shared/utils/format';

describe('formatVnd', () => {
  it('định dạng số tiền không có phần thập phân', () => {
    // Không so sánh chuỗi cứng: `Intl` dùng khoảng trắng hẹp (U+00A0) trước ký
    // hiệu tiền, khác nhau giữa các phiên bản ICU. So sánh chữ số là đủ và ổn định.
    expect(formatVnd(1500000).replace(/\D/g, '')).toBe('1500000');
    expect(formatVnd(0).replace(/\D/g, '')).toBe('0');
  });
});

describe('formatDuration', () => {
  it('trả về mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(59_000)).toBe('00:59');
    expect(formatDuration(60_000)).toBe('01:00');
    expect(formatDuration(15 * 60_000)).toBe('15:00');
  });

  it('kẹp giá trị âm về 00:00 thay vì hiện số âm', () => {
    // Đồng hồ đếm ngược hết hạn phải dừng ở 00:00, không được hiện "-01:23".
    expect(formatDuration(-5000)).toBe('00:00');
  });
});

describe('maskAccountNumber', () => {
  it('che phần giữa của số tài khoản dài', () => {
    expect(maskAccountNumber('19031234565678')).toBe('1903 **** 5678');
  });

  it('giữ nguyên số tài khoản ngắn', () => {
    // Che số ngắn thì gần như lộ hết mà lại làm người dùng không đối chiếu được.
    expect(maskAccountNumber('12345678')).toBe('12345678');
  });
});
