import {NativeModules, Platform} from 'react-native';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {StorageKey, appStorage} from '../services/storage/mmkv';
import {en} from './locales/en';
import {vi} from './locales/vi';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'vi';

/**
 * Ngôn ngữ hệ thống, đọc thẳng từ native — không dùng lib detector.
 *
 * `react-native-localize` chỉ để làm đúng một việc này, mà việc này là 6 dòng.
 * Thêm một native dependency nữa vào base đồng nghĩa với thêm một thứ có thể
 * vỡ khi nâng RN.
 */
function detectSystemLanguage(): Language {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

  const tag = String(locale ?? '').toLowerCase();
  return SUPPORTED_LANGUAGES.find(lang => tag.startsWith(lang)) ?? DEFAULT_LANGUAGE;
}

export function getInitialLanguage(): Language {
  const stored = appStorage.getString(StorageKey.language);
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as Language;
  }
  return detectSystemLanguage();
}

i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  defaultNS: 'translation',
  resources: {
    vi: {translation: vi},
    en: {translation: en},
  },
  interpolation: {
    // React đã escape sẵn; để i18next escape lần nữa sẽ làm hỏng ký tự tiếng Việt
    // trong một số trường hợp (dấu nháy, &).
    escapeValue: false,
  },
  returnNull: false,
  // Chỉ log missing key ở dev — ở prod nó chỉ làm nhiễu console của khách.
  debug: false,
  saveMissing: __DEV__,
  missingKeyHandler: __DEV__
    ? (_lngs, _ns, key) => console.warn(`[i18n] Thiếu bản dịch cho key: ${key}`)
    : undefined,
});

export default i18n;
