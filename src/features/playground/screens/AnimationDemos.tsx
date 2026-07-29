import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInRight,
  SlideOutLeft,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Button} from '@/shared/components/Button';
import {Card} from '@/shared/components/layout/Card';
import {useTheme} from '@/shared/contexts/ThemeContext';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Reanimated 4 — bảy dạng animation hay dùng
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Reanimated 4 chạy trên Worklets 0.5 (đã có sẵn trong base). Nhớ rằng
 *  `react-native-worklets/plugin` PHẢI là plugin CUỐI CÙNG trong
 *  babel.config.js — đặt sai chỗ thì mọi worklet im lặng chạy trên JS thread và
 *  animation giật mà không có lỗi nào.
 */

// ── 1. Timing vs Spring ─────────────────────────────────────────────────────

function TimingVsSpringDemo() {
  const theme = useTheme();
  const timing = useSharedValue(0);
  const spring = useSharedValue(0);
  const [on, setOn] = useState(false);

  const toggle = () => {
    const next = on ? 0 : 1;
    setOn(!on);
    timing.value = withTiming(next, {duration: 400, easing: Easing.inOut(Easing.cubic)});
    spring.value = withSpring(next, {damping: 12, stiffness: 120});
  };

  const timingStyle = useAnimatedStyle(() => ({
    transform: [{translateX: interpolate(timing.value, [0, 1], [0, 180])}],
  }));
  const springStyle = useAnimatedStyle(() => ({
    transform: [{translateX: interpolate(spring.value, [0, 1], [0, 180])}],
  }));

  return (
    <Card
      title="1 · Timing vs Spring"
      subtitle="Timing = thời lượng cố định. Spring = vật lý, có nảy.">
      <Animated.View style={[styles.dot, {backgroundColor: theme.colors.primary}, timingStyle]} />
      <View style={styles.rowGap} />
      <Animated.View style={[styles.dot, {backgroundColor: theme.colors.cta}, springStyle]} />
      <View style={styles.rowGap} />
      <Button title={on ? 'Về chỗ cũ' : 'Chạy'} variant="secondary" onPress={toggle} />
    </Card>
  );
}

// ── 2. Chuỗi + lặp (sequence, repeat, delay) ────────────────────────────────

function SequenceDemo() {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const play = () => {
    // withSequence chạy tuần tự; withRepeat(-1) là lặp vô hạn;
    // tham số `true` = chạy ngược lại sau mỗi lần (yoyo).
    scale.value = withSequence(
      withTiming(1.3, {duration: 180}),
      withSpring(1, {damping: 8}),
    );
    rotate.value = withDelay(
      120,
      withSequence(
        withTiming(0.15, {duration: 90}),
        withTiming(-0.15, {duration: 90}),
        withTiming(0, {duration: 90}),
      ),
    );
  };

  const style = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}, {rotateZ: `${rotate.value}rad`}],
  }));

  return (
    <Card title="2 · Chuỗi động tác" subtitle="withSequence + withDelay — hiệu ứng 'lắc'">
      <View style={styles.stage}>
        <Animated.View style={[styles.box, {backgroundColor: theme.colors.secondary}, style]} />
      </View>
      <Button title="Phát" variant="secondary" onPress={play} />
    </Card>
  );
}

// ── 3. Nội suy màu ──────────────────────────────────────────────────────────

function ColorDemo() {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, {duration: 2000}), -1, true);
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [theme.colors.primary, theme.colors.cta, theme.colors.info],
    ),
  }));

  return (
    <Card title="3 · Nội suy màu" subtitle="interpolateColor + withRepeat(yoyo)">
      <View style={styles.stage}>
        <Animated.View style={[styles.box, style]} />
      </View>
    </Card>
  );
}

// ── 4. Skeleton shimmer ─────────────────────────────────────────────────────

function SkeletonDemo() {
  const theme = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, {duration: 1100, easing: Easing.linear}), -1, false);
  }, [shimmer]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.4, 1, 0.4]),
  }));

  return (
    <Card title="4 · Skeleton" subtitle="Placeholder khi đang tải — tốt hơn spinner cho list">
      {[0, 1, 2].map(index => (
        <Animated.View
          key={index}
          style={[
            styles.skeletonLine,
            {backgroundColor: theme.colors.skeleton, width: index === 2 ? '60%' : '100%'},
            style,
          ]}
        />
      ))}
    </Card>
  );
}

// ── 5. Layout animation ─────────────────────────────────────────────────────

function LayoutDemo() {
  const theme = useTheme();
  const [items, setItems] = useState([1, 2, 3]);
  const [seq, setSeq] = useState(4);

  return (
    <Card
      title="5 · Layout animation"
      subtitle="entering / exiting / layout — không cần tự tính toạ độ">
      <View style={styles.chipRow}>
        {items.map(item => (
          <Animated.View
            key={item}
            entering={SlideInRight.duration(220)}
            exiting={SlideOutLeft.duration(180)}
            // `layout` là mấu chốt: các chip còn lại TRƯỢT tới chỗ mới thay vì
            // nhảy giật khi một chip bị xoá.
            layout={LinearTransition.springify().damping(16)}
            style={[styles.chip, {backgroundColor: theme.colors.primarySoft}]}>
            <Pressable onPress={() => setItems(current => current.filter(i => i !== item))}>
              <Text style={[theme.typography.body, {color: theme.colors.primary}]}>
                Mục {item} ✕
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
      <Button
        title="Thêm mục"
        variant="secondary"
        onPress={() => {
          setItems(current => [...current, seq]);
          setSeq(seq + 1);
        }}
      />
    </Card>
  );
}

// ── 6. Nhấn có phản hồi (micro-interaction) ─────────────────────────────────

function PressableScaleDemo() {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  return (
    <Card
      title="6 · Phản hồi khi nhấn"
      subtitle="Thu nhỏ 4% lúc nhấn — người dùng cảm nhận app 'nhạy' hơn hẳn">
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.96, {duration: 90});
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {damping: 12});
        }}>
        <Animated.View style={[styles.pressCard, {backgroundColor: theme.colors.primary}, style]}>
          <Text style={[theme.typography.button, {color: '#FFFFFF'}]}>Nhấn giữ thử</Text>
        </Animated.View>
      </Pressable>
    </Card>
  );
}

// ── 7. Hiện/ẩn có chuyển cảnh ───────────────────────────────────────────────

function FadeDemo() {
  const theme = useTheme();
  const [visible, setVisible] = useState(true);

  return (
    <Card title="7 · Fade in / out" subtitle="FadeIn / FadeOut dựng sẵn của Reanimated">
      <View style={styles.fadeStage}>
        {visible ? (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            style={[styles.box, {backgroundColor: theme.colors.info}]}
          />
        ) : null}
      </View>
      <Button
        title={visible ? 'Ẩn' : 'Hiện'}
        variant="secondary"
        onPress={() => setVisible(v => !v)}
      />
    </Card>
  );
}

export function AnimationDemos() {
  return (
    <>
      <TimingVsSpringDemo />
      <View style={styles.gap} />
      <SequenceDemo />
      <View style={styles.gap} />
      <ColorDemo />
      <View style={styles.gap} />
      <SkeletonDemo />
      <View style={styles.gap} />
      <LayoutDemo />
      <View style={styles.gap} />
      <PressableScaleDemo />
      <View style={styles.gap} />
      <FadeDemo />
    </>
  );
}

const styles = StyleSheet.create({
  gap: {height: 12},
  rowGap: {height: 10},
  stage: {height: 120, alignItems: 'center', justifyContent: 'center'},
  fadeStage: {height: 100, alignItems: 'center', justifyContent: 'center'},
  box: {width: 80, height: 80, borderRadius: 18},
  dot: {width: 32, height: 32, borderRadius: 16},
  skeletonLine: {height: 14, borderRadius: 7, marginBottom: 10},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, minHeight: 40},
  chip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999},
  pressCard: {height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
});
