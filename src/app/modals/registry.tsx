import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useAuth} from '@/features/auth';
import {Button} from '@/shared/components/Button';
import {MODAL_IDS} from '@/shared/components/modals/ids';

export type GlobalModalProps = {close: () => void};

type ModalDefinition = {
  component: React.ComponentType<GlobalModalProps>;
  /** false = buộc người dùng phải chọn, không đóng bằng backdrop/vuốt được. */
  dismissible?: boolean;
};

/**
 * Danh bạ modal toàn cục.
 *
 * Chỉ đăng ký ở đây những modal cần mở từ ngoài cây React. Mỗi mục là một chi
 * phí: nó sống suốt vòng đời app và không có ngữ cảnh màn hình nào.
 */

function ConfirmSignOutModal({close}: GlobalModalProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const {signOut} = useAuth();

  return (
    <View style={styles.gap}>
      <Text style={[theme.typography.h3, {color: theme.colors.text}]}>{t('auth.signOut')}</Text>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>
        {t('auth.signOutConfirm')}
      </Text>
      <View style={styles.row}>
        <Button
          title={t('common.cancel')}
          variant="secondary"
          onPress={close}
          style={styles.flex}
        />
        <Button
          title={t('auth.signOut')}
          onPress={() => {
            // Đóng modal TRƯỚC khi dispatch: saga logout sẽ đổi navigator, mà
            // đổi navigator khi còn modal mở gây kẹt backdrop trên Android.
            close();
            signOut();
          }}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

function PermissionDeniedModal({close}: GlobalModalProps) {
  const {t} = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.gap}>
      <Text style={[theme.typography.h3, {color: theme.colors.text}]}>
        {t('permission.deniedTitle')}
      </Text>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>
        {t('permission.denied')}
      </Text>
      <Button title={t('common.ok')} onPress={close} />
    </View>
  );
}

export const modalRegistry: Record<string, ModalDefinition> = {
  [MODAL_IDS.confirmSignOut]: {component: ConfirmSignOutModal, dismissible: true},
  [MODAL_IDS.permissionDenied]: {component: PermissionDeniedModal, dismissible: true},
};

const styles = StyleSheet.create({
  gap: {gap: 12},
  row: {flexDirection: 'row', gap: 12, marginTop: 8},
  flex: {flex: 1},
});
