import {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import type {Theme} from './index';
import {useTheme} from '../contexts/ThemeContext';

type NamedStyles<T> = {[K in keyof T]: object};

/**
 * Cầu nối giữa "chỉ dùng StyleSheet của React Native" và theme sáng/tối.
 *
 * Bạn đã chốt là **không dùng thư viện styling** nào. Nhưng `StyleSheet.create`
 * chạy ở tầng module, lúc đó chưa biết theme — nên cách duy nhất còn lại là
 * nhét màu inline vào từng component. Làm vậy thì:
 *   - style bị tạo lại mỗi lần render (mất tối ưu của StyleSheet)
 *   - màu rải khắp nơi, sót một chỗ là dark mode hỏng
 *
 * `makeStyles` giải quyết cả hai: vẫn là `StyleSheet.create` thật, nhưng nhận
 * theme làm tham số và được memo hoá theo theme. Đổi theme -> tạo lại đúng một
 * lần; render lại -> dùng lại object cũ.
 *
 * ```ts
 * const useStyles = makeStyles(theme => ({
 *   card: {
 *     backgroundColor: theme.colors.surface,
 *     padding: theme.spacing.md,
 *     borderRadius: theme.radius.md,
 *   },
 * }));
 *
 * function Card() {
 *   const styles = useStyles();
 *   return <View style={styles.card} />;
 * }
 * ```
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
