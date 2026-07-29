import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {getAbility, subscribeAbility, tagSubject} from './ability';
import type {Action, AppAbility, Subject} from './types';

const AbilityContext = createContext<AppAbility>(getAbility());

/**
 * Đồng bộ ability singleton (dùng bởi saga/service) vào React tree.
 *
 * Ability là object có thể thay đổi tại chỗ, nên React sẽ không tự re-render
 * khi rule đổi. Ta subscribe và set state để ép render lại — đây là lý do
 * `setAbilityRules` tạo instance MỚI thay vì `ability.update()`.
 */
export function AbilityProvider({children}: {children: React.ReactNode}) {
  const [ability, setAbility] = useState<AppAbility>(getAbility);

  useEffect(() => subscribeAbility(setAbility), []);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}

export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}

/** `const canEdit = useCan('update', order);` */
export function useCan(action: Action, subject: Subject | object): boolean {
  const ability = useAbility();
  return useMemo(() => ability.can(action, subject as never), [ability, action, subject]);
}

type CanProps = {
  do: Action;
  on: Subject;
  /** Bản ghi cụ thể — cần khi rule có `conditions` (vd: chỉ sửa đơn của mình). */
  this?: object;
  children: React.ReactNode;
  /** Hiện khi KHÔNG có quyền. Bỏ trống = ẩn hẳn. */
  fallback?: React.ReactNode;
};

/**
 * ```tsx
 * <Can do="update" on="Order" this={order}>
 *   <Button title="Sửa" onPress={edit} />
 * </Can>
 * ```
 *
 * Mặc định **ẩn hẳn** thay vì disable: một nút xám mà không giải thích được vì
 * sao xám chỉ làm người dùng bối rối. Cần disable kèm lý do thì dùng `fallback`.
 */
export function Can({do: action, on, this: instance, children, fallback = null}: CanProps) {
  const ability = useAbility();
  const target = instance ? tagSubject(on, instance) : on;
  return <>{ability.can(action, target as never) ? children : fallback}</>;
}
