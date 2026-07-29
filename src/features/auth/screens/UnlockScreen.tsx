import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {env} from '@/shared/config/env';
import {Button} from '@/shared/components/Button';
import {Screen} from '@/shared/components/layout/Screen';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '@/shared/contexts/ThemeContext';

/**
 * Màn khoá: đã có phiên nhưng đang bật mở khoá bằng sinh trắc học (mức 2).
 *
 * Tự bật prompt một lần khi vào màn — bắt người dùng bấm thêm một nút chỉ để
 * mở prompt là thừa. Nhưng nếu họ huỷ thì KHÔNG tự bật lại: prompt hiện đi hiện
 * lại là cách chắc chắn nhất để người dùng gỡ app.
 */
export function UnlockScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const {unlockWithBiometrics, signOut, pending, user} = useAuth();

  useEffect(() => {
    unlockWithBiometrics();
    // Chỉ chạy đúng một lần lúc mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={[theme.typography.h2, {color: theme.colors.text}]}>{env.app.name}</Text>
        <Text style={[theme.typography.body, styles.subtitle, {color: theme.colors.textMuted}]}>
          {user?.displayName
            ? `${t('auth.biometricPromptSubtitle')}\n${user.displayName}`
            : t('auth.biometricPromptSubtitle')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('auth.biometricSignIn')}
          onPress={unlockWithBiometrics}
          loading={pending === 'biometric'}
        />
        {/* Lối thoát bắt buộc: cảm biến hỏng, đổi vân tay, hoặc muốn đổi tài
            khoản. Không có nút này thì người dùng kẹt vĩnh viễn ở màn khoá. */}
        <Button title={t('auth.signOut')} variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8},
  emoji: {fontSize: 56, marginBottom: 8},
  subtitle: {textAlign: 'center'},
  actions: {gap: 8, paddingBottom: 16},
});
