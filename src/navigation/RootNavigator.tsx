import React, {useCallback, useEffect, useRef} from 'react';
import {NavigationContainer, type Theme as NavTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SplashScreen} from '@/shared/native';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {LoginScreen, UnlockScreen, useAuth} from '@/features/auth';
import {AppDrawer} from './AppDrawer';
import {linking} from './linking';
import {navigationRef} from './navigationRef';
import type {AuthStackParamList, RootStackParamList} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator({initialLocked}: {initialLocked: boolean}) {
  return (
    <AuthStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={initialLocked ? 'Unlock' : 'Login'}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Unlock" component={UnlockScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const {status, isAuthenticated, isLocked} = useAuth();
  const splashHidden = useRef(false);

  const navTheme: NavTheme = {
    dark: theme.isDark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.divider,
      notification: theme.colors.danger,
    },
    fonts: {
      regular: {fontFamily: String(theme.typography.body.fontFamily), fontWeight: '400'},
      medium: {fontFamily: String(theme.typography.body.fontFamily), fontWeight: '500'},
      bold: {fontFamily: String(theme.typography.body.fontFamily), fontWeight: '700'},
      heavy: {fontFamily: String(theme.typography.body.fontFamily), fontWeight: '800'},
    },
  };

  /**
   * Ẩn splash khi ĐÃ BIẾT đi đâu, không phải khi component mount.
   *
   * Ẩn sớm hơn thì người dùng thấy một nháy trắng rồi mới tới màn đích. Ẩn ở
   * đây nghĩa là frame đầu tiên họ nhìn thấy đã là màn đúng.
   *
   * Native có watchdog 8 giây nên kể cả bootstrap treo, splash vẫn tự tắt.
   */
  const hideSplashOnce = useCallback(() => {
    if (splashHidden.current) {return;}
    splashHidden.current = true;
    SplashScreen.hide();
  }, []);

  useEffect(() => {
    if (status !== 'booting') {
      // requestAnimationFrame: đợi navigator vẽ xong frame đầu.
      requestAnimationFrame(hideSplashOnce);
    }
  }, [status, hideSplashOnce]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={AppDrawer} />
        ) : (
          <RootStack.Screen name="Auth">
            {() => <AuthNavigator initialLocked={isLocked} />}
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
