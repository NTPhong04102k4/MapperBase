import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {I18nManager} from 'react-native';
import {useTranslation} from 'react-i18next';
import i18n, {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getInitialLanguage,
  type Language,
} from '../i18n';
import {StorageKey, appStorage} from '../services/storage/mmkv';

type LanguageContextValue = {
  language: Language;
  languages: readonly Language[];
  setLanguage: (language: Language) => void;
  /** Ngôn ngữ hiện tại có viết phải-sang-trái không (chưa dùng, để sẵn cho ar/he). */
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({children}: {children: React.ReactNode}) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((next: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) {
      console.warn(`[LanguageProvider] Ngôn ngữ không hỗ trợ: ${next}`);
      return;
    }
    appStorage.set(StorageKey.language, next);
    // changeLanguage trả Promise (i18next nạp resource bất đồng bộ). Resource ở
    // đây đã bundle sẵn nên nó resolve ngay, nhưng vẫn phải bắt lỗi — bỏ trôi thì
    // lỗi thành unhandled rejection và không ai biết ngôn ngữ đổi hụt.
    i18n.changeLanguage(next).catch(error => {
      console.warn('[LanguageProvider] Đổi ngôn ngữ thất bại', error);
    });
    setLanguageState(next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
      isRTL: I18nManager.isRTL,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage phải nằm trong <LanguageProvider>.');
  }
  return value;
}

/**
 * Re-export `useTranslation` để phần còn lại của app không phải import trực
 * tiếp từ react-i18next — nếu sau này đổi thư viện i18n, chỉ sửa ở đây.
 */
export {useTranslation};
export {DEFAULT_LANGUAGE};
export type {Language};
