import {darkColors, lightColors} from './colors';
import {radius, spacing} from './spacing';
import {typography} from './typography';

export type {ThemeColors} from './colors';
export {spacing, radius, typography, darkColors, lightColors};

/** Thời lượng animation dùng chung — một chỗ để cả app nhất quán. */
export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

/**
 * Bóng đổ. iOS dùng shadow*, Android dùng elevation — phải khai cả hai.
 * (`shadowColor` trên Android chỉ có tác dụng từ API 28.)
 */
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export type Theme = {
  isDark: boolean;
  colors: typeof lightColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  duration: typeof duration;
  shadow: typeof shadow;
};

export const lightTheme: Theme = {
  isDark: false,
  colors: lightColors,
  spacing,
  radius,
  typography,
  duration,
  shadow,
};

export const darkTheme: Theme = {
  isDark: true,
  colors: darkColors,
  spacing,
  radius,
  typography,
  duration,
  shadow,
};

// useTheme sống trong ThemeContext (tránh import vòng), re-export ở đây cho tiện.
export {useTheme, useThemeMode} from '../contexts/ThemeContext';
export {makeStyles} from './makeStyles';
