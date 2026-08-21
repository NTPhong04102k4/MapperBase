import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Appearance, StatusBar, useColorScheme} from 'react-native';
import {darkTheme, lightTheme, type Theme} from '../theme';
import {StorageKey, appStorage} from '../services/storage/mmkv';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeModeContextValue = {
  /** Lựa chọn của người dùng: light / dark / theo hệ thống. */
  mode: ThemeMode;
  /** Kết quả sau khi đã phân giải 'system'. */
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  /** Đảo light ↔ dark. Nếu đang 'system' thì chốt về ngược lại giá trị hiện tại. */
  toggle: () => void;
};

const ThemeContext = createContext<Theme>(lightTheme);
const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  const stored = appStorage.getString(StorageKey.themeMode);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const isSystemMode = mode === 'system';
  const isSystemSchemeDark = systemScheme === 'dark';

  let resolved: 'light' | 'dark';

  if (isSystemMode) {
    resolved = isSystemSchemeDark ? 'dark' : 'light';
  } else {
    resolved = mode;
  }
  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    appStorage.set(StorageKey.themeMode, next);
  }, []);

  const toggle = useCallback(() => {
    setModeState(current => {
      const currentResolved =
        current === 'system'
          ? Appearance.getColorScheme() === 'dark'
            ? 'dark'
            : 'light'
          : current;
      const next: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
      appStorage.set(StorageKey.themeMode, next);
      return next;
    });
  }, []);

  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  // Status bar phải đổi cùng theme. Đặt ở đây thay vì rải <StatusBar/> trong
  // từng màn hình — nếu rải, chỉ cần một màn quên là bị chữ trắng trên nền trắng.
  useEffect(() => {
    StatusBar.setBarStyle(resolved === 'dark' ? 'light-content' : 'dark-content', true);
  }, [resolved]);

  const modeValue = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolved,
      setMode,
      toggle,
    }),
    [mode, resolved, setMode, toggle],
  );

  return (
    <ThemeModeContext.Provider value={modeValue}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeModeContext.Provider>
  );
}

/** Token màu/khoảng cách/typography của theme hiện tại. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Đọc & đổi chế độ sáng/tối. Dùng ở màn Settings. */
export function useThemeMode(): ThemeModeContextValue {
  const value = useContext(ThemeModeContext);
  if (!value) {
    throw new Error('useThemeMode phải nằm trong <ThemeProvider>.');
  }
  return value;
}
