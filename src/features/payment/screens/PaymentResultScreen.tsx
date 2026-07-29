import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {Button} from '@/shared/components/Button';
import {Card, Row} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {selectPayment} from '../store/selectors';
import {paymentActions} from '../store/paymentSlice';
import {formatDateTime, formatVnd} from '@/shared/utils/format';

export function PaymentResultScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const payment = useAppSelector(selectPayment);

  const paid = payment.status === 'paid';
  const order = payment.order;

  // Số tiền nhận được có thể LỆCH với số tiền đơn: người dùng gõ tay sai số.
  // Im lặng coi là thành công thì kế toán sẽ phát hiện ra sau — và lúc đó khó
  // xử lý hơn nhiều. Hiện rõ ngay cho người dùng biết.
  const mismatch =
    paid &&
    order !== null &&
    payment.receivedAmount !== null &&
    payment.receivedAmount !== order.amount;

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{paid ? '✅' : '⏳'}</Text>
        <Text style={[theme.typography.h2, styles.center, {color: theme.colors.text}]}>
          {paid ? t('payment.paidTitle') : t('payment.expiredTitle')}
        </Text>
      </View>

      {order ? (
        <Card>
          <Row label={t('payment.amount')} value={formatVnd(order.amount)} />
          {payment.receivedAmount !== null ? (
            <Row label="Thực nhận" value={formatVnd(payment.receivedAmount)} />
          ) : null}
          <Row label="Mã đơn" value={order.orderRef} mono />
          {payment.bankTransactionId ? (
            <Row label="Mã giao dịch" value={payment.bankTransactionId} mono />
          ) : null}
          {order.paidAt ? <Row label="Thời điểm" value={formatDateTime(order.paidAt)} /> : null}
        </Card>
      ) : null}

      {mismatch ? (
        <>
          <View style={styles.gap} />
          <Card style={{borderColor: theme.colors.warning}}>
            <Text style={[theme.typography.body, {color: theme.colors.warning}]}>
              Số tiền nhận được khác số tiền của đơn. Bộ phận kế toán sẽ đối
              soát và liên hệ lại với bạn.
            </Text>
          </Card>
        </>
      ) : null}

      <View style={styles.gap} />

      <Button
        title={t('common.continue')}
        onPress={() => {
          dispatch(paymentActions.reset());
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {alignItems: 'center', gap: 12, paddingVertical: 32},
  emoji: {fontSize: 64},
  center: {textAlign: 'center'},
  gap: {height: 16},
});
