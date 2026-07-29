import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Button} from '@/shared/components/Button';
import {Card, Row} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {MODAL_IDS} from '@/shared/components/modals';
import {useAuth} from '@/features/auth';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {uiActions} from '@/store/uiSlice';

export function ProfileScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {
    user,
    biometricEnabled,
    transactionKeyEnrolled,
    enableBiometricUnlock,
    enrollTransactionKey,
  } = useAuth();
  const permissionCount = useAppSelector(state => state.permission.rules.length);

  return (
    <Screen scroll>
      <Text style={[theme.typography.h1, {color: theme.colors.text}]}>{t('nav.profile')}</Text>
      <View style={styles.gap} />

      <Card title={user?.displayName ?? '—'} subtitle={user?.email ?? user?.username}>
        <Row label="ID" value={user?.id ?? '—'} mono />
        <Row label="Vai trò" value={user?.roles?.join(', ') || '—'} />
        <Row label="Số quyền (CASL)" value={String(permissionCount)} />
      </Card>

      <View style={styles.gap} />

      {/*
        HAI mức sinh trắc học, cố ý tách thành hai mục riêng trong UI.

        Gộp làm một công tắc là sai về nghiệp vụ: mức 2 chỉ mở phiên trên máy
        này, mức 3 tạo chữ ký mà BACKEND kiểm chứng. Người dùng có thể muốn cái
        này mà không muốn cái kia.
      */}
      <Card title="Bảo mật">
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={[theme.typography.body, {color: theme.colors.text}]}>
              Mở khoá bằng sinh trắc học
            </Text>
            <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
              Mức 2 — thay việc đăng nhập lại mỗi lần mở app
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={enableBiometricUnlock}
            trackColor={{true: theme.colors.primary, false: theme.colors.border}}
          />
        </View>

        <View style={[styles.divider, {backgroundColor: theme.colors.divider}]} />

        <View style={styles.switchLabel}>
          <Text style={[theme.typography.body, {color: theme.colors.text}]}>
            {t('biometric.enrollTitle')}
          </Text>
          <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
            {t('biometric.enrollDescription')}
          </Text>
        </View>
        <Button
          title={transactionKeyEnrolled ? 'Đã đăng ký · Đăng ký lại' : 'Đăng ký'}
          variant="secondary"
          onPress={enrollTransactionKey}
        />
      </Card>

      <View style={styles.gap} />

      <Button
        title={t('auth.signOut')}
        variant="danger"
        onPress={() =>
          dispatch(uiActions.modalOpened({id: MODAL_IDS.confirmSignOut, variant: 'center'}))
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {height: 16},
  switchRow: {flexDirection: 'row', alignItems: 'center', gap: 16},
  switchLabel: {flex: 1, gap: 2, marginBottom: 8},
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 12},
});
