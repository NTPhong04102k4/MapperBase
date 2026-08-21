import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {useTranslation} from 'react-i18next';
import {env} from '@/shared/config/env';
import {useAuth} from '@/features/auth';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useAppDispatch} from '@/store/hooks';
import {uiActions} from '@/store/uiSlice';
import {MODAL_IDS} from '@/shared/components/modals';
import {AboutScreen} from '@/features/about';
import {PlaygroundScreen} from '@/features/playground';
import {SettingsScreen} from '@/features/settings';
import {BottomTabs} from './BottomTabs';
import type {DrawerParamList} from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

/**
 * Nội dung drawer tự vẽ thay vì dùng mặc định, để có ba thứ mà bản mặc định
 * không có: khối thông tin người dùng, nút đăng xuất ở đáy, và nhãn phiên bản.
 *
 * Nhãn phiên bản không phải chi tiết cho vui: QA báo bug mà không biết đang
 * test bản nào là vấn đề thật với nhịp build dày của TestFlight (docs/05 mục 3).
 */
function DrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const {t} = useTranslation();
  const {user} = useAuth();
  const dispatch = useAppDispatch();

  return (
    <View style={[styles.fill, {backgroundColor: theme.colors.surface}]}>
      <DrawerContentScrollView {...props}>
        <View style={[styles.header, {borderBottomColor: theme.colors.divider}]}>
          <View style={[styles.avatar, {backgroundColor: theme.colors.primarySoft}]}>
            <Text style={[theme.typography.h3, {color: theme.colors.primary}]}>
              {(user?.displayName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[theme.typography.h3, {color: theme.colors.text}]} numberOfLines={1}>
            {user?.displayName ?? '—'}
          </Text>
          <Text
            style={[theme.typography.caption, {color: theme.colors.textMuted}]}
            numberOfLines={1}>
            {user?.email ?? user?.username ?? ''}
          </Text>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, {borderTopColor: theme.colors.divider}]}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            dispatch(uiActions.modalOpened({id: MODAL_IDS.confirmSignOut, variant: 'center'}))
          }>
          <Text style={[theme.typography.button, {color: theme.colors.danger}]}>
            {t('auth.signOut')}
          </Text>
        </Pressable>

        <Text style={[theme.typography.caption, {color: theme.colors.textMuted}]}>
          {env.app.name} · {env.build.label}
        </Text>
      </View>
    </View>
  );
}

export function AppDrawer() {
  const theme = useTheme();
  const {t} = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={DrawerContent}
      screenOptions={{
        headerShown: true,
        headerStyle: {backgroundColor: theme.colors.surface},
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textMuted,
        drawerActiveBackgroundColor: theme.colors.primarySoft,
        drawerStyle: {backgroundColor: theme.colors.surface},
        // `front` giữ nội dung đứng yên và trượt panel lên trên — nhẹ hơn
        // `slide`/`permanent` trên máy yếu vì không phải layout lại cả màn.
        drawerType: 'front',
        swipeEdgeWidth: 40,
      }}>
      <Drawer.Screen
        name="Tabs"
        component={BottomTabs}
        options={{title: t('nav.home'), drawerLabel: t('nav.home')}}
      />
      <Drawer.Screen
        name="Playground"
        component={PlaygroundScreen}
        options={{title: t('nav.playground')}}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: t('nav.settings')}}
      />
      <Drawer.Screen name="About" component={AboutScreen} options={{title: t('nav.about')}} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
});
