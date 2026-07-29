import type {MongoAbility, MongoQuery, RawRuleOf} from '@casl/ability';

/** Hành động. Giữ ngắn và ổn định — đây là hợp đồng với backend. */
export type Action =
  | 'manage' // ký tự đại diện của CASL: mọi hành động
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'pay'
  | 'refund';

/** Đối tượng. `all` là ký tự đại diện của CASL. */
export type Subject =
  | 'all'
  | 'Order'
  | 'Payment'
  | 'Invoice'
  | 'Employee'
  | 'Department'
  | 'Report'
  | 'Setting'
  | 'Widget';

export type AppAbility = MongoAbility<[Action, Subject | Record<string, unknown>], MongoQuery>;

/**
 * Rule thô do backend trả về.
 *
 * Backend là nguồn sự thật duy nhất về quyền — client KHÔNG tự suy ra quyền từ
 * `user.role`. Suy ở client nghĩa là mỗi lần đổi chính sách phải phát hành app.
 *
 * Ví dụ payload:
 * ```json
 * [
 *   { "action": "read",   "subject": "Order" },
 *   { "action": "update", "subject": "Order", "conditions": { "ownerId": "u_123" } },
 *   { "action": "read",   "subject": "Employee", "fields": ["id", "name"] },
 *   { "action": "delete", "subject": "Order", "inverted": true,
 *     "reason": "Đơn đã chốt sổ không được xoá" }
 * ]
 * ```
 */
export type PermissionRule = RawRuleOf<AppAbility>;

export type PermissionPayload = {
  rules: PermissionRule[];
  /** Để biết bộ rule có cũ hơn server không; dùng cho cache. */
  version?: string;
  updatedAt?: string;
};
