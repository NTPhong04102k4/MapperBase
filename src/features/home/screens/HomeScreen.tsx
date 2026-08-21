import React, {useCallback, useEffect} from 'react';
import {AppState, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import dayjs from 'dayjs';
import {Button} from '@/shared/components/Button';
import {Card, Row} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {BottomModal, useModal} from '@/shared/components/modals';
import {env} from '@/shared/config/env';
import {useAuth} from '@/features/auth';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {Can} from '@/shared/permissions';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {selectWidget, widgetActions, widgetSideEffects} from '@/features/widget';

/**
 * Trang chủ — cũng là chỗ minh hoạ vòng đời snapshot của widget.
 *
 * Ghi snapshot khi app vào foreground là một trong ba nguồn cập nhật widget
 * (docs/05 mục 8bis). Hai nguồn còn lại: push sự kiện, và nhịp do OS tự chạy
 * cho phần suy ra từ thời gian.
 */
export function HomeScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const {user} = useAuth();
  const dispatch = useAppDispatch();
  const widget = useAppSelector(selectWidget);
  const detail = useModal();

  const pushSnapshot = useCallback(() => {
    dispatch(
      widgetActions.syncRequested({
        title: 'Ca làm hôm nay',
        primaryValue: dayjs().format('HH:mm'),
        secondaryValue: user?.displayName ?? '',
        // Mốc đếm ngược: widget tự đổi tới mốc này mà KHÔNG cần app sống và
        // không tốn ngân sách reload của WidgetKit.
        countdownTargetMs: dayjs().endOf('day').valueOf(),
      }),
    );
  }, [dispatch, user?.displayName]);

  useEffect(() => {
    dispatch(widgetSideEffects.checkInstallRequested());
    pushSnapshot();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        pushSnapshot();
      }
    });
    return () => subscription.remove();
  }, [dispatch, pushSnapshot]);

  return (
    <Screen scroll>
      <Text style={[theme.typography.h1, {color: theme.colors.text}]}>{t('nav.home')}</Text>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted, marginBottom: 24}]}>
        {user?.displayName ?? ''}
      </Text>

      <Card title={t('widget.title')} style={styles.card}>
        {widget.installed ? (
          <>
            <Row label={t('widget.title')} value={`${widget.count}`} />
            <Row
              label={t('widget.updatedAt', {time: ''}).trim()}
              value={widget.lastWrittenAt ? dayjs(widget.lastWrittenAt).format('HH:mm:ss') : '—'}
            />
            <Row label="Nhịp làm mới" value={`${widget.refreshMinutes} phút`} />
          </>
        ) : (
          <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>
            {t('widget.notInstalled')}
          </Text>
        )}
        <Button title="Ghi snapshot ngay" variant="secondary" onPress={pushSnapshot} />
      </Card>

      {/* Nút chỉ hiện khi có quyền — tầng CASL, xem src/permissions */}
      <Can do="read" on="Report">
        <Card title="Báo cáo" subtitle="Chỉ hiện khi ability cho phép read Report">
          <Button title="Xem chi tiết" variant="secondary" onPress={detail.open} />
        </Card>
      </Can>

      <View style={styles.spacer} />

      <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
        {env.app.name} · {env.build.label}
      </Text>

      <BottomModal visible={detail.visible} onClose={detail.close}>
        <Text style={[theme.typography.h3, {color: theme.colors.text}]}>Chi tiết</Text>
        <Text style={[theme.typography.body, {color: theme.colors.textMuted, marginTop: 8}]}>
          Vuốt xuống hoặc chạm nền để đóng.
        </Text>
        <View style={{height: 16}} />
        <Button title={t('common.close')} onPress={detail.close} />
      </BottomModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: 16, gap: 8},
  spacer: {height: 24},
});
