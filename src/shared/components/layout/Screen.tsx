import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';
import {useTheme} from '../../contexts/ThemeContext';

type ScreenProps = {
  children: React.ReactNode;
  /** true = bọc ScrollView. Đặt false cho màn có FlatList (không lồng list vào scroll). */
  scroll?: boolean;
  /** Cạnh cần chừa safe area. Màn trong tab thường không cần 'bottom'. */
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Bật khi màn có ô nhập liệu. */
  avoidKeyboard?: boolean;
};

/**
 * Khung màn hình dùng chung: nền theo theme, safe area, tránh bàn phím.
 *
 * Có nó để không phải nhớ ba thứ hay quên nhất ở mỗi màn mới:
 *   - nền cứng màu trắng ⇒ dark mode hỏng
 *   - thiếu SafeAreaView ⇒ nội dung chui dưới tai thỏ / thanh home
 *   - thiếu KeyboardAvoidingView ⇒ bàn phím che ô đang gõ trên iOS
 */
export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  padded = true,
  style,
  contentStyle,
  avoidKeyboard = false,
}: ScreenProps) {
  const theme = useTheme();

  const padding = padded ? {padding: theme.spacing.lg} : null;

  const body = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.grow, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, {backgroundColor: theme.colors.background}, style]}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          // 'height' trên Android vì hệ điều hành đã tự resize window
          // (windowSoftInputMode=adjustResize); dùng 'padding' sẽ cộng dồn hai lần.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  grow: {flexGrow: 1},
});
