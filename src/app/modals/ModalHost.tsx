import React from 'react';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {selectOpenModals} from '@/store/uiSelectors';
import {uiActions} from '@/store/uiSlice';
import {AppModal} from '@/shared/components/modals/AppModal';
import {modalRegistry} from './registry';

/**
 * Cổng render cho modal **toàn cục** — loại mở được từ ngoài cây React
 * (saga, deep link, handler push notification).
 *
 * Modal chỉ thuộc về một màn hình thì đừng đăng ký ở đây; dùng `useModal()`
 * ngay trong màn đó. Đưa mọi modal lên Redux sẽ biến store thành một cái bảng
 * điều khiển UI khổng lồ và làm mất khả năng tra ngược "modal này mở từ đâu".
 */
export function ModalHost() {
  const dispatch = useAppDispatch();
  const modals = useAppSelector(selectOpenModals);

  return (
    <>
      {modals.map(entry => {
        const definition = modalRegistry[entry.id];
        if (!definition) {
          if (__DEV__) {
            console.warn(
              `[ModalHost] Chưa đăng ký modal "${entry.id}" trong components/modals/registry.ts`,
            );
          }
          return null;
        }

        const Content = definition.component;
        const close = () => dispatch(uiActions.modalClosed(entry.id));

        return (
          <AppModal
            key={entry.id}
            visible
            variant={entry.variant}
            onClose={close}
            dismissOnBackdropPress={definition.dismissible ?? true}
            dismissOnSwipe={definition.dismissible ?? true}>
            <Content close={close} />
          </AppModal>
        );
      })}
    </>
  );
}
