import {NativeModules} from 'react-native';
import type {WidgetInstallInfo} from './types';

type WidgetNative = {
  writeSnapshot(payloadJson: string): Promise<boolean>;
  clearSnapshot(): Promise<boolean>;
  reload(): Promise<boolean>;
  isInstalled(): Promise<WidgetInstallInfo>;
};

const native = NativeModules.MapperWidget as WidgetNative | undefined;

export const WidgetBridge = {
  writeSnapshot(payload: unknown): Promise<boolean> {
    return native?.writeSnapshot(JSON.stringify(payload)) ?? Promise.resolve(false);
  },

  /**
   * ⚠️ HẠNG MỤC CHẶN PHÁT HÀNH (docs/05 mục 5).
   *
   * Phải `await` hàm này **trước khi** điều hướng về màn Login. Điều hướng
   * trước rồi mới xoá = có một khoảng thời gian dữ liệu người dùng cũ còn nằm
   * trên màn hình chính cho người cầm máy tiếp theo nhìn thấy.
   */
  clearSnapshot(): Promise<boolean> {
    return native?.clearSnapshot() ?? Promise.resolve(false);
  },

  reload(): Promise<boolean> {
    return native?.reload() ?? Promise.resolve(false);
  },

  isInstalled(): Promise<WidgetInstallInfo> {
    return (
      native?.isInstalled() ??
      Promise.resolve({installed: false, count: 0, refreshMinutes: 5})
    );
  },
};
