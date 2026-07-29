import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Button} from '@/shared/components/Button';
import {Card} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {HeaderModal, LeftModal, RightModal, useModal} from '@/shared/components/modals';
import {useTheme} from '@/shared/contexts/ThemeContext';

/**
 * Màn thử bộ modal theo hướng.
 *
 * Giữ ở đây (thay vì chỉ trong Playground) vì đây là ba biến thể hay dùng trong
 * sản phẩm thật: bộ lọc đổ từ trên, panel phụ trượt từ phải, menu ngữ cảnh
 * trượt từ trái.
 */
export function DiscoverScreen() {
  const theme = useTheme();
  const {t} = useTranslation();

  const filter = useModal();
  const detail = useModal();
  const menu = useModal();

  return (
    <Screen scroll>
      <Text style={[theme.typography.h1, {color: theme.colors.text}]}>{t('nav.discover')}</Text>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted, marginBottom: 24}]}>
        Modal theo hướng: trên · trái · phải
      </Text>

      <Card title="Bộ lọc" subtitle="HeaderModal — đổ xuống từ đỉnh" style={styles.card}>
        <Button title="Mở bộ lọc" variant="secondary" onPress={filter.open} />
      </Card>

      <Card title="Panel phụ" subtitle="RightModal — trượt từ phải" style={styles.card}>
        <Button title="Mở panel phải" variant="secondary" onPress={detail.open} />
      </Card>

      <Card title="Menu ngữ cảnh" subtitle="LeftModal — trượt từ trái" style={styles.card}>
        <Button title="Mở menu trái" variant="secondary" onPress={menu.open} />
      </Card>

      <HeaderModal visible={filter.visible} onClose={filter.close} showHandle>
        <Text style={[theme.typography.h3, {color: theme.colors.text}]}>Bộ lọc</Text>
        <Text style={[theme.typography.body, {color: theme.colors.textMuted, marginTop: 8}]}>
          Vuốt lên để đóng. Nội dung phải ngắn — panel này che đúng phần trên
          cùng, nơi người dùng đang nhìn.
        </Text>
        <View style={styles.gap} />
        <Button title={t('common.confirm')} onPress={filter.close} />
      </HeaderModal>

      <RightModal visible={detail.visible} onClose={detail.close}>
        <Text style={[theme.typography.h3, {color: theme.colors.text}]}>Chi tiết</Text>
        <Text style={[theme.typography.body, {color: theme.colors.textMuted, marginTop: 8}]}>
          Vuốt sang phải để đóng.
        </Text>
        <View style={styles.gap} />
        <Button title={t('common.close')} onPress={detail.close} />
      </RightModal>

      <LeftModal visible={menu.visible} onClose={menu.close}>
        <Text style={[theme.typography.h3, {color: theme.colors.text}]}>Menu</Text>
        <Text style={[theme.typography.body, {color: theme.colors.textMuted, marginTop: 8}]}>
          Vuốt sang trái để đóng.
        </Text>
        <View style={styles.gap} />
        <Button title={t('common.close')} onPress={menu.close} />
      </LeftModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: 12},
  gap: {height: 16},
});
