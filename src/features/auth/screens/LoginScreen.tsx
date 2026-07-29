import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {env} from '@/shared/config/env';
import {Button} from '@/shared/components/Button';
import {Screen} from '@/shared/components/layout/Screen';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '@/shared/contexts/ThemeContext';

/**
 * Màn đăng nhập.
 *
 * Bốn lối vào, tất cả đều kết thúc ở cùng một chỗ (`authSaga`):
 *   - ForgeRock journey username + password
 *   - Google / Facebook / Apple (OAuth2 → backend verify → phiên)
 *
 * Nút social bị disable RIÊNG theo `pending`, không disable cả form: bấm Google
 * rồi đổi ý muốn bấm Apple là chuyện bình thường.
 */
export function LoginScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const {signInWithCredentials, signInWithSocial, pending, error, errorKey} = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const busy = pending !== null;
  const message = errorKey ? t(errorKey) : error;

  const inputStyle = [
    styles.input,
    theme.typography.body,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      color: theme.colors.text,
    },
  ];

  return (
    <Screen scroll avoidKeyboard edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[theme.typography.h1, {color: theme.colors.text}]}>{env.app.name}</Text>
        <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>
          {t('auth.signIn')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder={t('auth.username')}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          style={inputStyle}
          accessibilityLabel={t('auth.username')}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.password')}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => signInWithCredentials(username, password)}
          style={inputStyle}
          accessibilityLabel={t('auth.password')}
        />

        {message ? (
          <Text style={[theme.typography.caption, {color: theme.colors.danger}]}>{message}</Text>
        ) : null}

        <Button
          title={t('auth.signIn')}
          onPress={() => signInWithCredentials(username, password)}
          loading={pending === 'credentials'}
          disabled={busy || username.length === 0 || password.length === 0}
        />
      </View>

      <View style={styles.divider}>
        <View style={[styles.line, {backgroundColor: theme.colors.divider}]} />
        <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
          {t('auth.orContinueWith')}
        </Text>
        <View style={[styles.line, {backgroundColor: theme.colors.divider}]} />
      </View>

      <View style={styles.social}>
        <Button
          title={t('auth.google')}
          variant="secondary"
          leading={<Text>🇬</Text>}
          onPress={() => signInWithSocial('google')}
          loading={pending === 'google'}
          disabled={busy}
        />
        <Button
          title={t('auth.facebook')}
          variant="secondary"
          leading={<Text>f</Text>}
          onPress={() => signInWithSocial('facebook')}
          loading={pending === 'facebook'}
          disabled={busy}
        />
        {/* Apple hiện trên cả hai nền tảng: iOS dùng API native, Android chạy
            web flow. Ẩn nút trên Android là làm người dùng Android không đăng
            nhập lại được bằng tài khoản họ đã tạo trên iPhone. */}
        <Button
          title={t('auth.apple')}
          variant="secondary"
          leading={<Text>🍎</Text>}
          onPress={() => signInWithSocial('apple')}
          loading={pending === 'apple'}
          disabled={busy}
        />
      </View>

      <Text style={[theme.typography.caption, styles.footer, {color: theme.colors.textMuted}]}>
        {env.app.name} · {env.build.label}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {marginTop: 48, marginBottom: 32, gap: 4},
  form: {gap: 12},
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  divider: {flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24},
  line: {flex: 1, height: StyleSheet.hairlineWidth},
  social: {gap: 12},
  footer: {marginTop: 'auto', paddingTop: 24, textAlign: 'center'},
});
