import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  /** Icon nhỏ bên trái nhãn. */
  leading?: React.ReactNode;
  testID?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
  loading,
  leading,
  testID,
}: ButtonProps) {
  const {colors, spacing, radius, typography} = useTheme();

  const palette: Record<ButtonVariant, {bg: string; fg: string; border: string}> = {
    primary: {bg: colors.cta, fg: '#FFFFFF', border: 'transparent'},
    secondary: {bg: 'transparent', fg: colors.primary, border: colors.primary},
    ghost: {bg: 'transparent', fg: colors.primary, border: 'transparent'},
    danger: {bg: colors.danger, fg: '#FFFFFF', border: 'transparent'},
  };
  const {bg, fg, border} = palette[variant];

  // `loading` cũng phải chặn nhấn: không chặn thì người dùng bấm hai lần và tạo
  // hai đơn/hai request — nguồn lỗi trùng bản ghi phổ biến nhất.
  const isBlocked = Boolean(disabled || loading);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isBlocked}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{disabled: isBlocked, busy: Boolean(loading)}}
      style={({pressed}) => [
        styles.base,
        {
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.sm,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 2 : 0,
          borderColor: border,
          opacity: isBlocked ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={fg} /> : leading}
        <Text style={[typography.button, {color: fg}]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // Tối thiểu 44pt (Apple) / 48dp (Material) cho vùng chạm.
    minHeight: 48,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
