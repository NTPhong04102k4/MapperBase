import React from 'react';
import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Card} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {queryKeys} from '@/shared/services/query/keys';
import {sepayApi} from '../services/sepayApi';
import type {SePayOrder} from '../services/types';
import {sift} from '@/shared/permissions';
import {formatDateTime, formatVnd} from '@/shared/utils/format';

/**
 * Lịch sử thanh toán — ví dụ đầy đủ của một màn list dùng TanStack Query
 * cộng **tầng phân quyền sau khi call về**.
 *
 * `sift('read', 'Payment', items)` chạy trên dữ liệu đã trả về, loại những bản
 * ghi mà rule CASL không cho xem. Đây là tầng thứ hai — backend vẫn phải lọc.
 * Tầng này bắt trường hợp backend trả dư và tránh hiện thứ mà bấm vào sẽ 403.
 */
export function PaymentHistoryScreen() {
  const theme = useTheme();
  const {t} = useTranslation();

  const {data, isLoading, isRefetching, refetch, error} = useQuery({
    queryKey: queryKeys.payments.history(),
    queryFn: async () => {
      const response = await sepayApi.history({page: 1, size: 50});
      return sift('read', 'Payment', response.items);
    },
  });

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data ?? []}
        keyExtractor={item => item.orderId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <Text style={[theme.typography.body, styles.empty, {color: theme.colors.textMuted}]}>
            {error ? t('error.unknown') : 'Chưa có giao dịch nào.'}
          </Text>
        }
        renderItem={renderHistoryItem}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

/**
 * Khai ở tầng module: `renderItem={({item}) => <HistoryItem .../>}` tạo một
 * component type mới mỗi lần màn hình render, khiến FlatList huỷ và dựng lại
 * toàn bộ dòng — mất vị trí cuộn và giật thấy rõ với danh sách dài.
 */
function renderHistoryItem({item}: {item: SePayOrder}) {
  return <HistoryItem order={item} />;
}

function HistoryItem({order}: {order: SePayOrder}) {
  const theme = useTheme();
  const {t} = useTranslation();

  const statusColor =
    order.status === 'paid'
      ? theme.colors.success
      : order.status === 'pending'
      ? theme.colors.warning
      : theme.colors.textMuted;

  return (
    <Card flat>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={[theme.typography.body, {color: theme.colors.text}]} numberOfLines={1}>
            {order.orderRef}
          </Text>
          <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
            {formatDateTime(order.paidAt ?? order.createdAt)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[theme.typography.body, {color: theme.colors.text, fontWeight: '700'}]}>
            {formatVnd(order.amount)}
          </Text>
          <Text style={[theme.typography.caption, {color: statusColor}]}>
            {t(`payment.status${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}`)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {padding: 16},
  separator: {height: 8},
  empty: {textAlign: 'center', marginTop: 48},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  flex: {flex: 1},
  right: {alignItems: 'flex-end'},
});
