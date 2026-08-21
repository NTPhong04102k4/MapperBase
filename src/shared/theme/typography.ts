import {Platform} from 'react-native';

// Inter is the recommended font (design-system/mapperbase/MASTER.md).
// Falls back to system font until Inter is bundled via react-native.config.js + assets/fonts.
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  h1: {fontFamily, fontSize: 32, fontWeight: '700' as const, lineHeight: 40},
  h2: {fontFamily, fontSize: 24, fontWeight: '600' as const, lineHeight: 32},
  h3: {fontFamily, fontSize: 20, fontWeight: '600' as const, lineHeight: 28},
  body: {fontFamily, fontSize: 16, fontWeight: '400' as const, lineHeight: 24},
  caption: {fontFamily, fontSize: 13, fontWeight: '400' as const, lineHeight: 18},
  button: {fontFamily, fontSize: 16, fontWeight: '600' as const, lineHeight: 22},
};
