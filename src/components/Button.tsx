import React from 'react';
import {Pressable, StyleSheet, Text, ViewStyle} from 'react-native';
import {useTheme} from '../theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({title, onPress, variant = 'primary', style, disabled}: ButtonProps) {
  const {colors, spacing, radius, typography} = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({pressed}) => [
        styles.base,
        {
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.sm,
          backgroundColor: variant === 'primary' ? colors.cta : 'transparent',
          borderWidth: variant === 'secondary' ? 2 : 0,
          borderColor: colors.primary,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      <Text
        style={[
          typography.button,
          {color: variant === 'primary' ? '#FFFFFF' : colors.primary},
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
