import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, TextInput, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import dayjs from 'dayjs';
import {Button} from '@/shared/components/Button';
import {Card, Row} from '@/shared/components/layout/Card';
import {Screen} from '@/shared/components/layout/Screen';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {selectPayment} from '../store/selectors';
import {paymentActions} from '../store/paymentSlice';
import {uiActions} from '@/store/uiSlice';
import {buildSePayQrUrl} from '../services/sepayApi';
import {formatVnd} from '@/shared/utils/format';
import {useCountdown} from '../hooks/useCountdown';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Màn thanh toán SePay
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Luồng người dùng:
 *    nhập số tiền → tạo đơn → hiện QR + thông tin CK → chờ → tự nhận kết quả
 *
 *  Điểm nghiệp vụ quan trọng nhất trên màn này: **nội dung chuyển khoản**.
 *  Đó là khoá đối soát duy nhất của SePay. Người dùng sửa nó thì tiền vào tài
 *  khoản nhưng webhook không map được về đơn, và đơn treo "chờ thanh toán"
 *  vĩnh viễn — sau đó là một ticket chăm sóc khách hàng. Vì vậy UI phải:
 *    - hiện nó thật to
 *    - cho copy bằng một chạm
 *    - nói rõ KHÔNG được sửa
 */
export function CheckoutScreen() {
  const theme = useTheme();
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const payment = useAppSelector(selectPayment);

  const [amountText, setAmountText] = useState('');

  const amount = useMemo(() => Number(amountText.replace(/\D/g, '')) || 0, [amountText]);
  const order = payment.order;

  const expiresIn = useCountdown(order?.expiresAt ?? null);

  // Rời màn hình = dừng poll. Không dọn thì vòng lặp chạy nền và tiếp tục
  // dispatch vào một đơn mà người dùng đã bỏ.
  useEffect(() => () => {
    dispatch(paymentActions.cancelOrderRequested());
  }, [dispatch]);

  const createOrder = () => {
    dispatch(
      paymentActions.createOrderRequested({
        amount,
        description: `Thanh toan Mapper ${dayjs().format('DDMMHHmm')}`,
        orderRef: `MP${dayjs().format('YYMMDDHHmmss')}`,
      }),
    );
  };

  const copy = (value: string) => {
    Clipboard.setString(value);
    dispatch(uiActions.toastShown({kind: 'success', message: '', i18nKey: 'payment.copied'}));
  };

  const errorMessage = payment.errorKey ? t(payment.errorKey) : payment.error;

  // ── Chưa có đơn: form nhập số tiền ───────────────────────────────────────
  if (!order) {
    return (
      <Screen scroll avoidKeyboard>
        <Text style={[theme.typography.h1, {color: theme.colors.text}]}>{t('payment.title')}</Text>
        <View style={styles.gap} />

        <Card title={t('payment.amount')}>
          <TextInput
            value={amountText}
            onChangeText={text => setAmountText(text.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.amountInput,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.sm,
              },
            ]}
            accessibilityLabel={t('payment.amount')}
          />
          <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
            {amount > 0 ? formatVnd(amount) : 'Nhập số tiền cần thanh toán'}
          </Text>
        </Card>

        {errorMessage ? (
          <Text style={[theme.typography.caption, styles.error, {color: theme.colors.danger}]}>
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.gap} />
        <Button
          title={t('payment.createOrder')}
          onPress={createOrder}
          loading={payment.creating}
          disabled={amount <= 0}
        />
      </Screen>
    );
  }

  // ── Đã có đơn: QR + thông tin chuyển khoản ───────────────────────────────
  const qrUrl = order.qrImageUrl || buildSePayQrUrl(order);
  const isPending = payment.status === 'pending';

  return (
    <Screen scroll>
      <Text style={[theme.typography.h1, {color: theme.colors.text}]}>
        {formatVnd(order.amount)}
      </Text>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>
        {t(`payment.status${capitalize(payment.status ?? 'pending')}`)}
      </Text>

      <View style={styles.gap} />

      {isPending ? (
        <Card title={t('payment.scanToPay')}>
          <View style={styles.qrWrapper}>
            <Image
              source={{uri: qrUrl}}
              style={styles.qr}
              resizeMode="contain"
              accessibilityLabel={t('payment.scanToPay')}
            />
          </View>
          {expiresIn ? (
            <Text style={[theme.typography.caption, styles.center, {color: theme.colors.warning}]}>
              {t('payment.expiresIn', {time: expiresIn})}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <View style={styles.gap} />

      <Card title="Thông tin chuyển khoản">
        <Row label={t('payment.bank')} value={order.bankName} />
        <Row label={t('payment.accountNumber')} value={order.accountNumber} mono />
        <Row label={t('payment.accountName')} value={order.accountName} />

        <View style={[styles.divider, {backgroundColor: theme.colors.divider}]} />

        <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
          {t('payment.transferContent')}
        </Text>
        <Text selectable style={[theme.typography.h3, styles.mono, {color: theme.colors.text}]}>
          {order.transferContent}
        </Text>
        <Text style={[theme.typography.caption, {color: theme.colors.danger}]}>
          Giữ nguyên nội dung này. Sửa hoặc thiếu là hệ thống không đối soát được.
        </Text>

        <View style={styles.row}>
          <Button
            title="Sao chép nội dung"
            variant="secondary"
            onPress={() => copy(order.transferContent)}
            style={styles.flex}
          />
          <Button
            title="Sao chép STK"
            variant="secondary"
            onPress={() => copy(order.accountNumber)}
            style={styles.flex}
          />
        </View>
      </Card>

      <View style={styles.gap} />

      {isPending ? (
        <Card>
          <View style={styles.waitingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <View style={styles.flex}>
              <Text style={[theme.typography.body, {color: theme.colors.text}]}>
                {t('payment.waitingTransfer')}
              </Text>
              <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
                {t('payment.autoDetect')}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <View style={styles.gap} />

      <Button
        title={isPending ? t('payment.cancelOrder') : 'Tạo đơn mới'}
        variant={isPending ? 'ghost' : 'primary'}
        onPress={() => {
          dispatch(isPending ? paymentActions.cancelOrderRequested() : paymentActions.reset());
        }}
      />
    </Screen>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  gap: {height: 16},
  center: {textAlign: 'center'},
  flex: {flex: 1},
  row: {flexDirection: 'row', gap: 12, marginTop: 12},
  error: {marginTop: 8},
  amountInput: {
    borderWidth: 1,
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    textAlign: 'right',
  },
  qrWrapper: {alignItems: 'center', paddingVertical: 8},
  qr: {width: 240, height: 240, backgroundColor: '#FFFFFF', borderRadius: 8},
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 12},
  mono: {fontVariant: ['tabular-nums'], marginVertical: 4},
  waitingRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
});
