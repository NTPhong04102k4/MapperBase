import {NativeModules} from 'react-native';

type SplashNative = {
  hide(): Promise<boolean>;
  show(): Promise<boolean>;
};

const native = NativeModules.MapperSplashScreen as SplashNative | undefined;

/**
 * Splash native.
 *
 * Gọi `hide()` khi app đã biết mình sẽ đi đâu (đã rehydrate token, đã dựng
 * xong navigator) — KHÔNG gọi ngay trong useEffect đầu tiên của App, vì lúc đó
 * màn đích còn chưa render và người dùng sẽ thấy một nháy trắng.
 *
 * Native đã có watchdog 8 giây: JS crash trước khi kịp gọi hide() thì splash
 * vẫn tự tắt thay vì kẹt vĩnh viễn.
 */
export const SplashScreen = {
  hide: (): Promise<boolean> => native?.hide() ?? Promise.resolve(false),
  show: (): Promise<boolean> => native?.show() ?? Promise.resolve(false),
};
