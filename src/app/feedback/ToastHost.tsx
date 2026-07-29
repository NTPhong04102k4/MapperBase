import React, {useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInUp, FadeOutUp, LinearTransition} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {selectToasts} from '@/store/uiSelectors';
import {uiActions, type ToastKind, type ToastPayload} from '@/store/uiSlice';

/**
 * Toast toàn cục.
 *
 * Đặt ở đỉnh màn hình chứ không phải đáy: đáy bị bàn phím che, và trên
 * Android còn đụng thanh điều hướng cử chỉ.
 *
 * `LinearTransition` để toast cũ trượt xuống mượt khi có toast mới, thay vì
 * nhảy giật.
 */
export function ToastHost() {
  const toasts = useAppSelector(selectToasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) {return null;}

  return (
    <View pointerEvents="box-none" style={[styles.host, {top: insets.top + 8}]}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastItem({toast}: {toast: ToastPayload}) {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {t} = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(uiActions.toastDismissed(toast.id));
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.durationMs]);

  const palette: Record<ToastKind, {bg: string; fg: string}> = {
    success: {bg: theme.colors.successSoft, fg: theme.colors.success},
    error: {bg: theme.colors.dangerSoft, fg: theme.colors.danger},
    warning: {bg: theme.colors.warningSoft, fg: theme.colors.warning},
    info: {bg: theme.colors.infoSoft, fg: theme.colors.info},
  };
  const {bg, fg} = palette[toast.kind];

  // i18nKey được ưu tiên: saga thường không biết ngôn ngữ hiện tại, nên nó gửi
  // key thay vì chuỗi đã dịch.
  const message = toast.i18nKey ? t(toast.i18nKey) : toast.message;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(180)}
      layout={LinearTransition.duration(180)}
      style={[
        styles.toast,
        theme.shadow.md,
        {backgroundColor: bg, borderColor: fg, borderRadius: theme.radius.md},
      ]}>
      <Pressable
        onPress={() => dispatch(uiActions.toastDismissed(toast.id))}
        accessibilityRole="button"
        accessibilityLabel={message}>
        <Text style={[theme.typography.body, {color: fg}]} numberOfLines={3}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
  },
});
