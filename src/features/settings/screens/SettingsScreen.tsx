import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Card} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {useLanguage, type Language} from '@/shared/contexts/LanguageContext';
import {useTheme, useThemeMode, type ThemeMode} from '@/shared/contexts/ThemeContext';

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{selected}}
      style={({pressed}) => [styles.option, {opacity: pressed ? 0.7 : 1}]}>
      <Text style={[theme.typography.body, {color: theme.colors.text}]}>{label}</Text>
      <View
        style={[
          styles.radio,
          {borderColor: selected ? theme.colors.primary : theme.colors.border},
        ]}>
        {selected ? (
          <View style={[styles.radioDot, {backgroundColor: theme.colors.primary}]} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const {mode, setMode} = useThemeMode();
  const {language, setLanguage} = useLanguage();

  const themeOptions: Array<{value: ThemeMode; label: string}> = [
    {value: 'light', label: t('settings.themeLight')},
    {value: 'dark', label: t('settings.themeDark')},
    {value: 'system', label: t('settings.themeSystem')},
  ];

  const languageOptions: Array<{value: Language; label: string}> = [
    {value: 'vi', label: t('settings.languageVi')},
    {value: 'en', label: t('settings.languageEn')},
  ];

  return (
    <Screen scroll>
      <Card title={t('settings.appearance')}>
        {themeOptions.map(option => (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={mode === option.value}
            onPress={() => setMode(option.value)}
          />
        ))}
      </Card>

      <View style={styles.gap} />

      <Card title={t('settings.language')}>
        {languageOptions.map(option => (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={language === option.value}
            onPress={() => setLanguage(option.value)}
          />
        ))}
      </Card>

      <View style={styles.gap} />

      <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
        Lựa chọn được lưu trong MMKV kho `app` — không bị xoá khi đăng xuất, nên lần đăng nhập sau
        vẫn giữ nguyên giao diện và ngôn ngữ.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {height: 16},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 48,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {width: 10, height: 10, borderRadius: 5},
});
