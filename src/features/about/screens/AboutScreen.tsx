import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Card, Row} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {env} from '@/shared/config/env';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {AppEnv} from '@/shared/native';

/**
 * Màn About — **bắt buộc có**, không phải chi tiết cho vui.
 *
 * Với nhịp build dày của TestFlight và Play Internal, QA báo bug mà không biết
 * đang test bản nào là vấn đề thật (docs/05 mục 3). Bốn dòng dưới đây trả lời
 * đúng câu hỏi đó: môi trường nào, bản nào, build số mấy, commit nào.
 */
export function AboutScreen() {
  const theme = useTheme();
  const {t} = useTranslation();

  return (
    <Screen scroll>
      <Card title={t('about.title')}>
        <Row label={t('about.environment')} value={env.flavor} />
        <Row label={t('about.version')} value={env.build.version} />
        <Row label={t('about.build')} value={String(env.build.number)} mono />
        <Row label={t('about.commit')} value={env.build.gitSha} mono />
      </Card>

      <View style={styles.gap} />

      <Card title="Cấu hình runtime">
        <Row label="applicationId" value={AppEnv.applicationId} mono />
        <Row label="API" value={env.apiBaseUrl} />
        <Row label="ForgeRock" value={`${env.forgeRock.url} (${env.forgeRock.realm})`} />
        <Row label="SePay" value={env.sePay.env} />
        <Row label="Widget refresh" value={`${env.widget.refreshMinutes} phút`} />
        <Row label="Deep link" value={`${env.app.scheme}://`} mono />
      </Card>

      <View style={styles.gap} />

      <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
        Mọi giá trị trên đến từ BuildConfig (Android) / Info.plist (iOS) theo
        flavor đang build — không có file .env nào trong dự án này.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {height: 16},
});
