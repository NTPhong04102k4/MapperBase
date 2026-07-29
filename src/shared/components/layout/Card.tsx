import React from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';

type CardProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  /** Bỏ bóng đổ khi card nằm trong list dài (bóng đổ tốn khá nhiều fill-rate). */
  flat?: boolean;
};

export function Card({children, title, subtitle, style, flat}: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          borderColor: theme.colors.divider,
        },
        flat ? styles.flat : theme.shadow.sm,
        style,
      ]}>
      {title ? (
        <Text style={[theme.typography.h3, {color: theme.colors.text}]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[theme.typography.caption, {color: theme.colors.textMuted, marginTop: 2}]}>
          {subtitle}
        </Text>
      ) : null}
      {title || subtitle ? <View style={{height: theme.spacing.sm}} /> : null}
      {children}
    </View>
  );
}

export function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  /** Dùng cho số tài khoản, mã giao dịch — số dễ đọc và không nhảy cột. */
  mono?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>{label}</Text>
      <Text
        selectable
        style={[
          theme.typography.body,
          styles.rowValue,
          {color: theme.colors.text},
          mono ? styles.mono : null,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {borderWidth: StyleSheet.hairlineWidth},
  flat: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 6,
  },
  rowValue: {flexShrink: 1, textAlign: 'right', fontWeight: '600'},
  mono: {fontVariant: ['tabular-nums']},
});
