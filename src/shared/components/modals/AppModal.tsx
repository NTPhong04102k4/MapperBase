import React, {useCallback, useEffect} from 'react';
import {
  BackHandler,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import {GestureDetector, Gesture, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../contexts/ThemeContext';

export type ModalVariant = 'bottom' | 'center' | 'header' | 'left' | 'right';

export type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  children: React.ReactNode;
  /** Bấm ra ngoài để đóng. Tắt khi modal buộc phải có lựa chọn. */
  dismissOnBackdropPress?: boolean;
  /** Vuốt để đóng. Tắt khi bên trong có ScrollView cùng hướng. */
  dismissOnSwipe?: boolean;
  /** Thanh kéo nhỏ ở đầu modal (chỉ hợp lý với bottom/header). */
  showHandle?: boolean;
  /** Chiều rộng panel trượt ngang, mặc định 82% màn hình. */
  sideWidth?: number;
  /** Chiều cao tối đa của bottom sheet, mặc định 88% màn hình. */
  maxHeightRatio?: number;
  contentStyle?: ViewStyle;
  /** Nhãn cho screen reader. */
  accessibilityLabel?: string;
};

const SPRING = {duration: 260};
/** Vuốt quá ngần này (px) thì đóng, dưới thì bật lại. */
const DISMISS_THRESHOLD = 90;
/** Vuốt nhanh hơn ngần này (px/s) thì đóng bất kể quãng đường. */
const DISMISS_VELOCITY = 800;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Một component modal, năm hướng
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Vì sao gộp làm một thay vì viết năm component riêng: backdrop, khoá nút
 *  back của Android, safe area, khoá cuộn nền, ngưỡng vuốt — năm cái giống hệt
 *  nhau. Viết riêng thì chắc chắn có cái quên xử lý nút back, có cái quên inset.
 *  Chỗ khác nhau thật sự chỉ là **trục và dấu của phép trượt**.
 *
 *  ⚠️ Ba cạm bẫy đã xử lý sẵn ở đây:
 *
 *  1. `<RNModal>` trên Android tạo một cây view NATIVE RIÊNG. Gesture handler
 *     không xuyên qua được, nên bên trong phải có `GestureHandlerRootView`
 *     riêng — thiếu nó thì vuốt không ăn, mà cũng không có lỗi nào.
 *
 *  2. Nút back cứng của Android **không** tự đóng modal. Phải đăng ký
 *     BackHandler, nếu không người dùng bấm back là thoát cả app.
 *
 *  3. Animation phải chạy xong RỒI mới gỡ modal khỏi cây. Gỡ ngay thì
 *     animation đóng không bao giờ được nhìn thấy. Ở đây dùng `runOnJS` trong
 *     callback của `withTiming`.
 */
export function AppModal({
  visible,
  onClose,
  variant = 'bottom',
  children,
  dismissOnBackdropPress = true,
  dismissOnSwipe = true,
  showHandle = variant === 'bottom',
  sideWidth,
  maxHeightRatio = 0.88,
  contentStyle,
  accessibilityLabel,
}: AppModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();

  // Giữ modal trong cây tới khi animation đóng chạy xong.
  const [mounted, setMounted] = React.useState(visible);

  const progress = useSharedValue(0); // 0 = đóng hẳn, 1 = mở hẳn
  const drag = useSharedValue(0); // độ lệch do ngón tay, đơn vị px

  const panelWidth = sideWidth ?? Math.min(width * 0.82, 360);
  const isHorizontal = variant === 'left' || variant === 'right';
  const travel = isHorizontal ? panelWidth : height;

  const finishClose = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, SPRING);
    } else if (mounted) {
      progress.value = withTiming(0, SPRING, finished => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
    // `mounted` cố tình không nằm trong deps: thêm vào sẽ tạo vòng lặp
    // set-state → effect → set-state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, drag, progress]);

  // Nút back cứng Android.
  useEffect(() => {
    if (!mounted) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true; // đã xử lý, đừng thoát app
    });
    return () => subscription.remove();
  }, [mounted, onClose]);

  const requestClose = useCallback(() => {
    progress.value = withTiming(0, SPRING, finished => {
      if (finished) {
        runOnJS(finishClose)();
      }
    });
  }, [finishClose, progress]);

  // ── Cử chỉ vuốt đóng ─────────────────────────────────────────────────────

  const pan = Gesture.Pan()
    .enabled(dismissOnSwipe && variant !== 'center')
    // Chỉ nhận cử chỉ khi đã đi được 10px theo đúng trục — nếu không, mỗi cú
    // chạm nhẹ vào nội dung đều bị hiểu nhầm là vuốt.
    .activeOffsetX(isHorizontal ? (variant === 'right' ? [-10, 10] : [-10, 10]) : [-9999, 9999])
    .activeOffsetY(isHorizontal ? [-9999, 9999] : [-10, 10])
    .onUpdate(event => {
      const raw = isHorizontal ? event.translationX : event.translationY;
      // Chỉ cho kéo theo chiều đóng; kéo ngược lại thì "dính" (chia 4) để có
      // phản hồi xúc giác mà không kéo modal ra khỏi màn hình.
      switch (variant) {
        case 'bottom':
          drag.value = raw > 0 ? raw : raw / 4;
          break;
        case 'header':
          drag.value = raw < 0 ? raw : raw / 4;
          break;
        case 'left':
          drag.value = raw < 0 ? raw : raw / 4;
          break;
        case 'right':
          drag.value = raw > 0 ? raw : raw / 4;
          break;
      }
    })
    .onEnd(event => {
      const distance = Math.abs(drag.value);
      const velocity = Math.abs(isHorizontal ? event.velocityX : event.velocityY);
      const goingToClose =
        (variant === 'bottom' && drag.value > 0) ||
        (variant === 'header' && drag.value < 0) ||
        (variant === 'left' && drag.value < 0) ||
        (variant === 'right' && drag.value > 0);

      if (goingToClose && (distance > DISMISS_THRESHOLD || velocity > DISMISS_VELOCITY)) {
        progress.value = withTiming(0, SPRING, finished => {
          if (finished) {
            runOnJS(finishClose)();
          }
        });
      } else {
        drag.value = withTiming(0, {duration: 180});
      }
    });

  // ── Style động ───────────────────────────────────────────────────────────

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const panelStyle = useAnimatedStyle(() => {
    const hidden = interpolate(progress.value, [0, 1], [travel, 0]);
    switch (variant) {
      case 'bottom':
        return {transform: [{translateY: hidden + drag.value}]};
      case 'header':
        return {transform: [{translateY: -hidden + drag.value}]};
      case 'left':
        return {transform: [{translateX: -hidden + drag.value}]};
      case 'right':
        return {transform: [{translateX: hidden + drag.value}]};
      case 'center':
      default:
        return {
          opacity: progress.value,
          transform: [{scale: interpolate(progress.value, [0, 1], [0.92, 1])}],
        };
    }
  });

  if (!mounted) {
    return null;
  }

  const panelLayout = getPanelLayout({
    variant,
    theme,
    insets,
    panelWidth,
    maxHeight: height * maxHeightRatio,
  });

  return (
    <RNModal
      transparent
      visible
      animationType="none" // animation do Reanimated lo, dùng cả hai sẽ giật
      statusBarTranslucent
      // Đã xử lý back bằng BackHandler ở trên; vẫn khai để iOS/tvOS nhất quán.
      onRequestClose={onClose}>
      {/* Bắt buộc: cây view của RNModal nằm ngoài GestureHandlerRootView gốc */}
      <GestureHandlerRootView style={styles.fill}>
        <View style={[styles.fill, getContainerAlignment(variant)]}>
          <Animated.View
            style={[styles.backdrop, {backgroundColor: theme.colors.overlay}, backdropStyle]}>
            <Pressable
              style={styles.fill}
              disabled={!dismissOnBackdropPress}
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            />
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel}
              style={[panelLayout, panelStyle, contentStyle]}>
              {/* Thanh kéo nằm ở CẠNH vuốt được: trên cùng với bottom sheet,
                  dưới cùng với header sheet. Đặt sai phía là người dùng không
                  nhận ra vuốt được. */}
              {showHandle && variant !== 'header' ? (
                <View style={[styles.handle, {backgroundColor: theme.colors.border}]} />
              ) : null}
              {children}
              {showHandle && variant === 'header' ? (
                <View
                  style={[
                    styles.handle,
                    styles.handleBottom,
                    {backgroundColor: theme.colors.border},
                  ]}
                />
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </RNModal>
  );
}

function getContainerAlignment(variant: ModalVariant): ViewStyle {
  switch (variant) {
    case 'bottom':
      return {justifyContent: 'flex-end'};
    case 'header':
      return {justifyContent: 'flex-start'};
    case 'left':
      return {flexDirection: 'row', justifyContent: 'flex-start'};
    case 'right':
      return {flexDirection: 'row', justifyContent: 'flex-end'};
    case 'center':
    default:
      return {justifyContent: 'center', alignItems: 'center', padding: 24};
  }
}

function getPanelLayout({
  variant,
  theme,
  insets,
  panelWidth,
  maxHeight,
}: {
  variant: ModalVariant;
  theme: ReturnType<typeof useTheme>;
  insets: {top: number; bottom: number};
  panelWidth: number;
  maxHeight: number;
}): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.lg,
  };

  switch (variant) {
    case 'bottom':
      return {
        ...base,
        width: '100%',
        maxHeight,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        // Không cộng inset.bottom là nội dung bị thanh home của iPhone che mất.
        paddingBottom: insets.bottom + theme.spacing.md,
        paddingTop: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
      };
    case 'header':
      return {
        ...base,
        width: '100%',
        maxHeight,
        borderBottomLeftRadius: theme.radius.lg,
        borderBottomRightRadius: theme.radius.lg,
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      };
    case 'left':
    case 'right':
      return {
        ...base,
        width: panelWidth,
        height: '100%',
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: insets.bottom + theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      };
    case 'center':
    default:
      return {
        ...base,
        width: '100%',
        maxWidth: 420,
        maxHeight,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
      };
  }
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  backdrop: StyleSheet.absoluteFillObject,
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  handleBottom: {
    marginBottom: 0,
    marginTop: 12,
  },
});
