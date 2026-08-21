import {createMongoAbility, subject as asSubject} from '@casl/ability';
import type {Action, AppAbility, PermissionRule, Subject} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Tầng phân quyền phía client (CASL)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Đây là **tầng thứ hai**, không phải tầng bảo mật. Backend vẫn phải kiểm tra
 *  quyền ở mọi endpoint. Tầng này tồn tại để:
 *
 *    1. Không hiện nút mà bấm vào chắc chắn nhận 403 — trải nghiệm tệ và làm
 *       người dùng nghĩ app hỏng.
 *    2. Chặn sớm ở client, tiết kiệm một vòng mạng.
 *    3. Diễn đạt được quyền THEO ĐIỀU KIỆN ("sửa được đơn của chính mình")
 *       mà `if (role === 'admin')` không diễn đạt nổi.
 *
 *  ⚠️ Không bao giờ dùng ability để giấu dữ liệu nhạy cảm đã tải về máy.
 *  Dữ liệu đã nằm trong bộ nhớ thiết bị thì coi như đã lộ. Muốn giấu thì
 *  backend đừng trả về.
 */

/** Ability rỗng: chưa đăng nhập hoặc chưa tải xong quyền — không cho làm gì. */
export function createEmptyAbility(): AppAbility {
  return createMongoAbility<AppAbility>([]);
}

/**
 * Dựng ability từ rule của backend.
 *
 * `detectSubjectType` giải quyết vấn đề cốt lõi: CASL cần biết một object thuộc
 * subject nào. Mặc định nó lấy `constructor.name` — nhưng JSON từ API là object
 * thuần, `constructor.name === 'Object'` cho tất cả, và mọi rule đều trượt.
 * Ở đây ta quy ước backend gắn trường `__type` vào mỗi entity.
 */
export function createAbilityFromRules(rules: PermissionRule[]): AppAbility {
  return createMongoAbility<AppAbility>(rules, {
    detectSubjectType: item => {
      if (typeof item === 'string') {
        return item as Subject;
      }
      const type = (item as {__type?: string})?.__type;
      return (type ?? 'all') as Subject;
    },
  });
}

/**
 * Gắn nhãn subject cho một object khi backend không trả `__type`.
 *
 * ```ts
 * ability.can('update', tagSubject('Order', order));
 * ```
 */
export function tagSubject<T extends object>(type: Subject, object: T) {
  return asSubject(type as string, object as Record<string, unknown>);
}

/**
 * Vì sao ability đọc/ghi được từ ngoài React: saga cần kiểm tra quyền trước khi
 * gọi API, mà saga không có hook. Một instance dùng chung là cách đơn giản nhất;
 * React đọc nó qua AbilityContext.
 */
let currentAbility: AppAbility = createEmptyAbility();
const listeners = new Set<(ability: AppAbility) => void>();

export function getAbility(): AppAbility {
  return currentAbility;
}

export function setAbilityRules(rules: PermissionRule[]): AppAbility {
  currentAbility = createAbilityFromRules(rules);
  listeners.forEach(listener => listener(currentAbility));
  return currentAbility;
}

export function resetAbility(): AppAbility {
  currentAbility = createEmptyAbility();
  listeners.forEach(listener => listener(currentAbility));
  return currentAbility;
}

export function subscribeAbility(listener: (ability: AppAbility) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Kiểm tra nhanh ngoài React (saga, service). */
export function can(action: Action, subject: Subject | object): boolean {
  return currentAbility.can(action, subject as never);
}

export function cannot(action: Action, subject: Subject | object): boolean {
  return !can(action, subject);
}
