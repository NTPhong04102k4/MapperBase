import {permittedFieldsOf} from '@casl/ability/extra';
import {ApiError} from '../services/http/errors';
import {getAbility, tagSubject} from './ability';
import type {Action, Subject} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  "Xử lý phân quyền một tầng nữa khi call về"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Bốn hàm dưới đây chạy **sau khi** API trả dữ liệu, trước khi dữ liệu vào
 *  store/UI. Mục đích không phải bảo mật (dữ liệu đã về máy rồi) mà là:
 *
 *    - loại bản ghi mà người dùng không được xem, phòng khi backend trả dư
 *    - che field nhạy cảm theo `fields` trong rule
 *    - chặn hành động ngay ở client thay vì đợi 403
 *
 *  Cách dùng điển hình trong service:
 *
 *  ```ts
 *  export async function fetchOrders() {
 *    const raw = await api.get<Order[]>('/orders');
 *    return sift('read', 'Order', raw);   // <- tầng phân quyền
 *  }
 *  ```
 */

/** Lọc mảng: chỉ giữ bản ghi mà người dùng được phép `action`. */
export function sift<T extends object>(action: Action, type: Subject, items: T[]): T[] {
  const ability = getAbility();
  return items.filter(item => ability.can(action, tagSubject(type, item) as never));
}

/**
 * Một bản ghi: trả về `null` nếu không được xem.
 *
 * Trả `null` thay vì ném lỗi vì "không thấy" là trạng thái hợp lệ của UI
 * (danh sách rỗng, màn hình trống), không phải sự cố.
 */
export function siftOne<T extends object>(action: Action, type: Subject, item: T): T | null {
  return getAbility().can(action, tagSubject(type, item) as never) ? item : null;
}

/**
 * Che field theo rule.
 *
 * Rule `{ action: 'read', subject: 'Employee', fields: ['id', 'name'] }` nghĩa
 * là chỉ được đọc hai field đó. Hàm này xoá phần còn lại khỏi object.
 *
 * Nếu rule không khai `fields` (được đọc toàn bộ) thì trả nguyên object.
 */
export function maskFields<T extends Record<string, unknown>>(
  action: Action,
  type: Subject,
  item: T,
): Partial<T> {
  const ability = getAbility();
  const allowed = permittedFieldsOf(ability, action, tagSubject(type, item) as never, {
    fieldsFrom: rule => rule.fields ?? Object.keys(item),
  });

  if (allowed.length === Object.keys(item).length) {
    return item;
  }

  const out: Partial<T> = {};
  for (const key of allowed) {
    if (key in item) {
      out[key as keyof T] = item[key as keyof T];
    }
  }
  return out;
}

/**
 * Chặn một hành động trước khi gọi API.
 *
 * Ném `ApiError` kind `forbidden` — cùng loại với 403 thật, nên UI chỉ cần một
 * nhánh xử lý cho cả hai trường hợp.
 */
export function assertCan(action: Action, subject: Subject | object): void {
  if (getAbility().can(action, subject as never)) {
    return;
  }

  const rule = getAbility().relevantRuleFor(action, subject as never);
  throw new ApiError({
    kind: 'forbidden',
    status: null,
    code: 'CLIENT_PERMISSION_DENIED',
    // `reason` do backend đặt trong rule inverted — nói rõ VÌ SAO bị cấm, tốt
    // hơn nhiều so với "Bạn không có quyền".
    message: rule?.reason ?? 'Không có quyền thực hiện thao tác này.',
    i18nKey: 'permission.denied',
  });
}
