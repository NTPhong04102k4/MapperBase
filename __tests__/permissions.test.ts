import {assertCan, can, resetAbility, setAbilityRules, sift, siftOne} from '@/shared/permissions';
import {ApiError} from '@/shared/services/http/errors';

type Order = {__type: 'Order'; id: string; ownerId: string};

const order = (id: string, ownerId: string): Order => ({__type: 'Order', id, ownerId});

afterEach(() => {
  resetAbility();
});

describe('ability rỗng', () => {
  it('không cho làm gì khi chưa nạp rule', () => {
    // Mặc định phải là TỪ CHỐI. Nếu mặc định là cho phép thì trong lúc chờ
    // /auth/permissions trả về, người dùng thấy đủ nút và bấm được.
    expect(can('read', 'Order')).toBe(false);
    expect(can('pay', 'Payment')).toBe(false);
  });
});

describe('rule theo điều kiện', () => {
  beforeEach(() => {
    setAbilityRules([
      {action: 'read', subject: 'Order'},
      {action: 'update', subject: 'Order', conditions: {ownerId: 'u_1'}},
    ]);
  });

  it('cho đọc mọi đơn', () => {
    expect(can('read', 'Order')).toBe(true);
  });

  it('chỉ cho sửa đơn của chính mình', () => {
    expect(can('update', order('o1', 'u_1'))).toBe(true);
    expect(can('update', order('o2', 'u_2'))).toBe(false);
  });
});

describe('sift — lọc dữ liệu SAU khi API trả về', () => {
  beforeEach(() => {
    setAbilityRules([{action: 'read', subject: 'Order', conditions: {ownerId: 'u_1'}}]);
  });

  it('loại bản ghi không được xem, phòng khi backend trả dư', () => {
    const items = [order('o1', 'u_1'), order('o2', 'u_2'), order('o3', 'u_1')];
    expect(sift('read', 'Order', items).map(o => o.id)).toEqual(['o1', 'o3']);
  });

  it('siftOne trả null thay vì ném lỗi — "không thấy" là trạng thái hợp lệ', () => {
    expect(siftOne('read', 'Order', order('o2', 'u_2'))).toBeNull();
    expect(siftOne('read', 'Order', order('o1', 'u_1'))).not.toBeNull();
  });
});

describe('assertCan', () => {
  it('ném ApiError kind forbidden để UI chỉ cần một nhánh xử lý với 403 thật', () => {
    setAbilityRules([{action: 'read', subject: 'Order'}]);
    try {
      assertCan('delete', 'Order');
      throw new Error('assertCan lẽ ra phải ném lỗi');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).kind).toBe('forbidden');
      expect((error as ApiError).i18nKey).toBe('permission.denied');
    }
  });

  it('dùng `reason` của rule inverted để nói rõ VÌ SAO bị cấm', () => {
    setAbilityRules([
      {action: 'delete', subject: 'Order'},
      {
        action: 'delete',
        subject: 'Order',
        inverted: true,
        reason: 'Đơn đã chốt sổ không được xoá',
      },
    ]);
    try {
      assertCan('delete', 'Order');
      throw new Error('assertCan lẽ ra phải ném lỗi');
    } catch (error) {
      expect((error as ApiError).message).toBe('Đơn đã chốt sổ không được xoá');
    }
  });
});
