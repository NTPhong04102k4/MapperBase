import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Card} from '@/shared/components/layout/Card';
import {useTheme} from '@/shared/contexts/ThemeContext';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Gesture Handler — sáu cử chỉ hay dùng nhất
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Nguyên tắc chung cho cả file này: **giá trị chuyển động sống trong
 *  SharedValue, không trong React state.**
 *
 *  Nếu dùng `useState`, mỗi frame là một lần render lại toàn bộ cây React và
 *  một lần đi qua cầu JS→native. Trên máy yếu sẽ tụt xuống 20–30fps ngay. Với
 *  SharedValue, cử chỉ và animation chạy hẳn trên UI thread; JS thread có bận
 *  cũng không ảnh hưởng.
 *
 *  Chỉ `runOnJS` khi thật sự cần chạm vào thế giới React (setState, dispatch,
 *  điều hướng) — mỗi lần gọi là một lần nhảy thread.
 */

const BOX = 88;

// ── 1. Kéo thả (Pan) ────────────────────────────────────────────────────────

function PanDemo() {
  const theme = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const pan = Gesture.Pan()
    // Lưu vị trí lúc bắt đầu, nếu không thì mỗi lần chạm lại là hộp nhảy về 0.
    .onChange(event => {
      x.value += event.changeX;
      y.value += event.changeY;
    })
    .onEnd(() => {
      // Bật về giữa bằng spring — cho cảm giác vật lý thay vì cắt cụt.
      x.value = withSpring(0, {damping: 14});
      y.value = withSpring(0, {damping: 14});
    });

  const style = useAnimatedStyle(() => ({
    transform: [{translateX: x.value}, {translateY: y.value}],
  }));

  return (
    <Card title="1 · Kéo thả" subtitle="Pan + spring về vị trí cũ">
      <View style={styles.stage}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.box, {backgroundColor: theme.colors.primary}, style]} />
        </GestureDetector>
      </View>
    </Card>
  );
}

// ── 2. Phóng to + xoay (Pinch + Rotation đồng thời) ─────────────────────────

function PinchRotateDemo() {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate(event => {
      // Chặn trên/dưới: không chặn thì người dùng thu nhỏ về 0 và không còn gì
      // để chạm vào nữa.
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 0.5), 3);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .onUpdate(event => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  // `Simultaneous` để pinch và rotate cùng nhận sự kiện — đây là cách người
  // dùng thật thao tác trên ảnh: vừa phóng vừa xoay.
  const composed = Gesture.Simultaneous(pinch, rotate);

  const style = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}, {rotateZ: `${rotation.value}rad`}],
  }));

  return (
    <Card title="2 · Phóng to & xoay" subtitle="Pinch + Rotation chạy đồng thời">
      <View style={styles.stage}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.box, {backgroundColor: theme.colors.secondary}, style]} />
        </GestureDetector>
      </View>
    </Card>
  );
}

// ── 3. Chạm đôi & giữ lâu (Tap + LongPress, loại trừ nhau) ──────────────────

function TapDemo() {
  const theme = useTheme();
  const [label, setLabel] = useState('Chạm đôi hoặc giữ lâu');
  const scale = useSharedValue(1);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(scale.value > 1 ? 1 : 1.4);
      runOnJS(setLabel)('Chạm đôi ✓');
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(setLabel)('Giữ lâu ✓');
    });

  // `Exclusive`: chạm đôi được ưu tiên. Dùng `Race` thì giữ lâu có thể cướp
  // mất cú chạm thứ hai và chạm đôi gần như không bao giờ nhận được.
  const composed = Gesture.Exclusive(doubleTap, longPress);

  const style = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  return (
    <Card title="3 · Chạm đôi & giữ lâu" subtitle="Gesture.Exclusive — ưu tiên chạm đôi">
      <View style={styles.stage}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.box, {backgroundColor: theme.colors.cta}, style]} />
        </GestureDetector>
      </View>
      <Text style={[theme.typography.caption, styles.center, {color: theme.colors.textMuted}]}>
        {label}
      </Text>
    </Card>
  );
}

// ── 4. Vuốt để xoá ──────────────────────────────────────────────────────────

function SwipeToDeleteRow({label, onDelete}: {label: string; onDelete: () => void}) {
  const theme = useTheme();
  const x = useSharedValue(0);
  const height = useSharedValue(56);
  const opacity = useSharedValue(1);

  const pan = Gesture.Pan()
    // Chỉ nhận khi đã đi ngang 15px — nếu không thì cuộn dọc trong list cũng bị
    // hiểu nhầm thành vuốt xoá.
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onChange(event => {
      x.value = Math.min(0, x.value + event.changeX);
    })
    .onEnd(() => {
      if (x.value < -110) {
        // Thu chiều cao về 0 trước khi gỡ khỏi danh sách — gỡ ngay thì các dòng
        // dưới nhảy giật lên.
        x.value = withTiming(-400, {duration: 180});
        opacity.value = withTiming(0, {duration: 180});
        height.value = withTiming(0, {duration: 200}, finished => {
          if (finished) {runOnJS(onDelete)();}
        });
      } else {
        x.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{translateX: x.value}],
  }));

  return (
    <Animated.View style={[styles.swipeRow, rowStyle]}>
      <View style={[styles.deleteBg, {backgroundColor: theme.colors.danger}]}>
        <Text style={[theme.typography.button, {color: '#FFFFFF'}]}>Xoá</Text>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.swipeContent,
            {backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.divider},
            contentStyle,
          ]}>
          <Text style={[theme.typography.body, {color: theme.colors.text}]}>{label}</Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function SwipeListDemo() {
  const theme = useTheme();
  const [items, setItems] = useState(['Đơn hàng #1', 'Đơn hàng #2', 'Đơn hàng #3']);

  return (
    <Card title="4 · Vuốt để xoá" subtitle="Pan có ngưỡng + thu chiều cao khi xoá">
      {items.length === 0 ? (
        <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
          Đã xoá hết. Mở lại màn để nạp lại danh sách.
        </Text>
      ) : (
        items.map(item => (
          <SwipeToDeleteRow
            key={item}
            label={item}
            onDelete={() => setItems(current => current.filter(i => i !== item))}
          />
        ))
      )}
    </Card>
  );
}

// ── 5. Kéo có nam châm (snap points) ────────────────────────────────────────

function SnapDemo() {
  const theme = useTheme();
  const x = useSharedValue(0);
  const SNAP = [0, 100, 200];

  const pan = Gesture.Pan()
    .onChange(event => {
      x.value = Math.min(Math.max(x.value + event.changeX, 0), 200);
    })
    .onEnd(event => {
      // Tính điểm dừng theo cả **vị trí lẫn vận tốc**. Chỉ tính vị trí thì cú
      // hất nhanh sẽ dừng ở điểm gần nhất, trái với trực giác người dùng.
      const projected = x.value + event.velocityX * 0.15;
      let nearest = SNAP[0];
      for (const point of SNAP) {
        if (Math.abs(point - projected) < Math.abs(nearest - projected)) {nearest = point;}
      }
      x.value = withSpring(nearest, {damping: 18, stiffness: 180});
    });

  const style = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));

  return (
    <Card title="5 · Nam châm (snap)" subtitle="Điểm dừng tính theo vị trí + vận tốc">
      <View style={[styles.track, {backgroundColor: theme.colors.surfaceAlt}]}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.knob, {backgroundColor: theme.colors.primary}, style]} />
        </GestureDetector>
      </View>
    </Card>
  );
}

export function GestureDemos() {
  return (
    <>
      <PanDemo />
      <View style={styles.gap} />
      <PinchRotateDemo />
      <View style={styles.gap} />
      <TapDemo />
      <View style={styles.gap} />
      <SwipeListDemo />
      <View style={styles.gap} />
      <SnapDemo />
    </>
  );
}

const styles = StyleSheet.create({
  gap: {height: 12},
  center: {textAlign: 'center', marginTop: 8},
  stage: {height: 140, alignItems: 'center', justifyContent: 'center'},
  box: {width: BOX, height: BOX, borderRadius: 20},
  swipeRow: {justifyContent: 'center', marginBottom: 8, overflow: 'hidden'},
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 24,
    borderRadius: 10,
  },
  swipeContent: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  track: {height: 56, borderRadius: 28, justifyContent: 'center', paddingHorizontal: 4},
  knob: {width: 48, height: 48, borderRadius: 24},
});
