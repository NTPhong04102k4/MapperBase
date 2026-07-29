import type {LinkingOptions} from '@react-navigation/native';
import {env} from '@/shared/config/env';
import type {RootStackParamList} from './types';

/**
 * Deep link.
 *
 * Scheme khác nhau theo flavor (`mapper://`, `mapperstg://`, `mapperdev://`) để
 * ba app cài song song không giành link của nhau — cài chung scheme thì hệ điều
 * hành chọn ngẫu nhiên app nào mở, và ta sẽ mất rất nhiều thời gian để hiểu vì
 * sao link dev lại mở app prod.
 *
 * Ai gửi link tới đây:
 *   - widget (`mapper://home`, `mapper://login`)
 *   - notification khi bấm vào
 *   - SePay redirect sau khi thanh toán
 *   - ForgeRock OAuth2 redirect (xử lý riêng bởi SDK, không qua đây)
 */
// Polyfill `URL` của React Native chưa có `.host`, nên tách host bằng regex.
// Dùng `new URL(...).host` sẽ chạy được trên Chrome debugger rồi undefined
// trên máy thật — đúng loại lỗi chỉ lộ ra ở bản release.
const apiHost = env.apiBaseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [`${env.app.scheme}://`, `https://${apiHost}`],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Unlock: 'unlock',
        },
      },
      Main: {
        screens: {
          Tabs: {
            screens: {
              Home: 'home',
              Discover: 'discover',
              Payment: {
                screens: {
                  Checkout: 'pay/:orderRef?',
                  PaymentResult: 'pay/result/:orderId',
                  PaymentHistory: 'pay/history',
                },
              },
              Profile: 'profile',
            },
          },
          Settings: 'settings',
          About: 'about',
          Playground: 'playground',
        },
      },
    },
  },
};
