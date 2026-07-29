/**
 * Query key tập trung một chỗ.
 *
 * Viết `['orders', id]` rải rác trong component là cách chắc chắn nhất để
 * `invalidateQueries` trượt: chỉ cần một chỗ viết `['order', id]` (số ít) là
 * cache không bao giờ được làm mới, và bug đó rất khó nhìn ra.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  permissions: () => ['permissions'] as const,

  payments: {
    all: () => ['payments'] as const,
    detail: (orderId: string) => ['payments', 'detail', orderId] as const,
    status: (orderId: string) => ['payments', 'status', orderId] as const,
    history: (filters?: Record<string, unknown>) =>
      ['payments', 'history', filters ?? {}] as const,
  },

  widget: {
    snapshot: () => ['widget', 'snapshot'] as const,
  },
} as const;
