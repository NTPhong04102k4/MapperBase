import {useColorScheme} from 'react-native';
import {lightColors, darkColors} from './colors';
import {spacing, radius} from './spacing';
import {typography} from './typography';

export {spacing, radius, typography};
export type {ThemeColors} from './colors';

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    spacing,
    radius,
    typography,
  };
}
