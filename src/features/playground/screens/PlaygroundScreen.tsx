import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '@/shared/components/Button';
import {Card} from '@/shared/components/layout/Card';
import {
  BottomModal,
  CenterModal,
  HeaderModal,
  LeftModal,
  RightModal,
  useModal,
} from '@/shared/components/modals';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {AnimationDemos} from './AnimationDemos';
import {GestureDemos} from './GestureDemos';

type Section = 'gesture' | 'animation' | 'modal';

const HEADER_MAX = 120;
const HEADER_MIN = 56;

/**
 * Sân chơi để kiểm chứng nhanh gesture, animation và bộ modal.
 *
 * Bản thân header của màn này cũng là một demo: **header co lại theo cuộn**,
 * dạng animation hay được hỏi nhất và cũng hay bị làm sai nhất.
 *
 * Chỗ hay sai: dùng `onScroll` của React với `useState`. Mỗi frame cuộn là một
 * lần render lại toàn bộ màn ⇒ giật thấy rõ. `useAnimatedScrollHandler` chạy
 * hẳn trên UI thread, JS thread có bận cũng không ảnh hưởng tới header.
 */
export function PlaygroundScreen() {
  const theme = useTheme();
  const [section, setSection] = useState<Section>('gesture');
  const scrollY = useSharedValue(0);

  const bottom = useModal();
  const center = useModal();
  const header = useModal();
  const left = useModal();
  const right = useModal();

  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, HEADER_MAX - HEADER_MIN],
      [HEADER_MAX, HEADER_MIN],
      Extrapolation.CLAMP,
    ),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [
      {translateY: interpolate(scrollY.value, [0, 60], [0, -12], Extrapolation.CLAMP)},
    ],
  }));

  const sections: Array<{key: Section; label: string}> = [
    {key: 'gesture', label: 'Cử chỉ'},
    {key: 'animation', label: 'Animation'},
    {key: 'modal', label: 'Modal'},
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, {backgroundColor: theme.colors.background}]}>
      <Animated.View
        style={[
          styles.header,
          {backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider},
          headerStyle,
        ]}>
        <Animated.Text
          style={[theme.typography.h1, {color: theme.colors.text}, titleStyle]}
          numberOfLines={1}>
          Playground
        </Animated.Text>

        <View style={styles.tabs}>
          {sections.map(item => {
            const active = section === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setSection(item.key)}
                accessibilityRole="tab"
                accessibilityState={{selected: active}}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                    borderRadius: theme.radius.sm,
                  },
                ]}>
                <Text
                  style={[
                    theme.typography.caption,
                    {color: active ? '#FFFFFF' : theme.colors.textMuted, fontWeight: '600'},
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {section === 'gesture' ? <GestureDemos /> : null}
        {section === 'animation' ? <AnimationDemos /> : null}
        {section === 'modal' ? (
          <>
            <Card title="Năm hướng modal" subtitle="Cùng một component, khác trục trượt">
              <View style={styles.buttons}>
                <Button title="Bottom" variant="secondary" onPress={bottom.open} />
                <Button title="Center" variant="secondary" onPress={center.open} />
                <Button title="Header (trên)" variant="secondary" onPress={header.open} />
                <Button title="Left" variant="secondary" onPress={left.open} />
                <Button title="Right" variant="secondary" onPress={right.open} />
              </View>
            </Card>
            <View style={styles.gap} />
            <Card title="Ghi chú">
              <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>
                Bottom / Header / Left / Right vuốt theo trục của mình để đóng.
                Center cố tình KHÔNG vuốt đóng được — nó dùng cho việc buộc phải
                chọn một phương án.
              </Text>
            </Card>
          </>
        ) : null}
      </Animated.ScrollView>

      <BottomModal visible={bottom.visible} onClose={bottom.close}>
        <DemoBody title="Bottom modal" hint="Vuốt xuống để đóng" onClose={bottom.close} />
      </BottomModal>

      <CenterModal visible={center.visible} onClose={center.close}>
        <DemoBody title="Center modal" hint="Không vuốt đóng được" onClose={center.close} />
      </CenterModal>

      <HeaderModal visible={header.visible} onClose={header.close}>
        <DemoBody title="Header modal" hint="Vuốt lên để đóng" onClose={header.close} />
      </HeaderModal>

      <LeftModal visible={left.visible} onClose={left.close}>
        <DemoBody title="Left modal" hint="Vuốt sang trái để đóng" onClose={left.close} />
      </LeftModal>

      <RightModal visible={right.visible} onClose={right.close}>
        <DemoBody title="Right modal" hint="Vuốt sang phải để đóng" onClose={right.close} />
      </RightModal>
    </SafeAreaView>
  );
}

function DemoBody({
  title,
  hint,
  onClose,
}: {
  title: string;
  hint: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.demoBody}>
      <Text style={[theme.typography.h3, {color: theme.colors.text}]}>{title}</Text>
      <Text style={[theme.typography.body, {color: theme.colors.textMuted}]}>{hint}</Text>
      <Button title="Đóng" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabs: {flexDirection: 'row', gap: 8, paddingBottom: 10},
  tab: {paddingHorizontal: 14, paddingVertical: 8},
  content: {padding: 16, paddingBottom: 48},
  buttons: {gap: 8},
  gap: {height: 12},
  demoBody: {gap: 12},
});
