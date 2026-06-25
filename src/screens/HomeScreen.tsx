import React from 'react';
import {ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../theme';
import {Button} from '../components/Button';

const BENEFITS = [
  'Plan and organize your maps in one place',
  'Fast, offline-first experience',
  'Sync securely across devices',
];

export function HomeScreen() {
  const {colors, spacing, typography, isDark} = useTheme();

  return (
    <SafeAreaView style={[styles.flex, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView
        contentContainerStyle={[styles.content, {padding: spacing.lg}]}
        showsVerticalScrollIndicator={false}>
        <View style={{marginTop: spacing['2xl']}}>
          <Text style={[typography.h1, {color: colors.text}]}>MapperBase</Text>
          <Text style={[typography.body, {color: colors.textMuted, marginTop: spacing.sm}]}>
            Your maps, organized and ready whenever you need them.
          </Text>
        </View>

        <View style={{marginTop: spacing.xl}}>
          {BENEFITS.map(item => (
            <View key={item} style={[styles.benefitRow, {marginBottom: spacing.md}]}>
              <View style={[styles.bullet, {backgroundColor: colors.primary}]} />
              <Text style={[typography.body, {color: colors.text, flex: 1}]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{marginTop: spacing.xl}}>
          <Button title="Get Started" onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {flexGrow: 1},
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
});
