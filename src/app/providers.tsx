import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClientProvider} from '@tanstack/react-query';
import {Provider as ReduxProvider} from 'react-redux';
import {AbilityProvider} from '@/shared/permissions';
import {queryClient} from '@/shared/services/query/queryClient';
import {store} from '@/store';
import {ModalHost} from './modals/ModalHost';
import {ToastHost} from './feedback/ToastHost';
import {AuthProvider} from '@/features/auth';
import {LanguageProvider} from '@/shared/contexts/LanguageContext';
import {ThemeProvider} from '@/shared/contexts/ThemeContext';

/**
 * ⚠️ THỨ TỰ CÁC PROVIDER LÀ CÓ Ý, ĐỪNG SẮP XẾP LẠI CHO "GỌN".
 *
 *  GestureHandlerRootView  phải là gốc tuyệt đối, nếu không mọi cử chỉ trong
 *                          modal/drawer im lặng không hoạt động trên Android
 *  SafeAreaProvider        modal cần inset để không đè lên tai thỏ/thanh home
 *  ReduxProvider           AuthProvider dùng useAppSelector -> phải nằm trong
 *  QueryClientProvider     hook query dùng ở mọi màn
 *  AbilityProvider         đọc ability singleton mà saga ghi vào
 *  ThemeProvider           mọi thứ bên dưới cần token màu
 *  LanguageProvider        ToastHost/ModalHost hiện chuỗi đã dịch
 *  AuthProvider            kích hoạt bootstrap phiên
 *  ModalHost / ToastHost   nằm CUỐI để vẽ đè lên toàn bộ cây
 */
export function AppProviders({children}: {children: React.ReactNode}) {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <AbilityProvider>
              <ThemeProvider>
                <LanguageProvider>
                  <AuthProvider>
                    {children}
                    <ModalHost />
                    <ToastHost />
                  </AuthProvider>
                </LanguageProvider>
              </ThemeProvider>
            </AbilityProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export {useAuth} from '@/features/auth';
export {useLanguage, useTranslation} from '@/shared/contexts/LanguageContext';
export {useTheme, useThemeMode} from '@/shared/contexts/ThemeContext';
export type {ThemeMode} from '@/shared/contexts/ThemeContext';
export type {Language} from '@/shared/contexts/LanguageContext';
