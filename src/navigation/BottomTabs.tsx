import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/shared/contexts/ThemeContext';
import {useCan} from '@/shared/permissions';
import {DiscoverScreen} from '@/features/discover';
import {HomeScreen} from '@/features/home';
import {CheckoutScreen, PaymentHistoryScreen, PaymentResultScreen} from '@/features/payment';
import {ProfileScreen} from '@/features/profile';
import type {BottomTabParamList, PaymentStackParamList} from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const PaymentStack = createNativeStackNavigator<PaymentStackParamList>();

function PaymentNavigator() {
  const {t} = useTranslation();
  return (
    <PaymentStack.Navigator screenOptions={{headerShown: false}}>
      <PaymentStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{title: t('payment.title')}}
      />
      <PaymentStack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <PaymentStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
    </PaymentStack.Navigator>
  );
}

/**
 * Icon là emoji, cố ý.
 *
 * Base chưa cài thư viện icon nào. `react-native-vector-icons` cần link font ở
 * cả hai nền tảng và là một thứ nữa phải bảo trì khi nâng RN. Emoji hiển thị
 * đúng trên mọi máy, không tốn dung lượng, và thay bằng icon thật sau này chỉ
 * là sửa một hàm.
 */
function TabIcon({emoji, focused}: {emoji: string; focused: boolean}) {
  return <Text style={[styles.icon, {opacity: focused ? 1 : 0.55}]}>{emoji}</Text>;
}

/**
 * Hàm render icon khai ở tầng module, KHÔNG khai trong thân `BottomTabs`.
 *
 * Khai bên trong thì mỗi lần BottomTabs render lại sẽ tạo một component type
 * mới, React coi đó là component khác và **huỷ toàn bộ cây con** của tab —
 * mất state, mất vị trí cuộn, và animation của tab bar bị giật.
 */
const tabIcon = (emoji: string) =>
  function renderTabIcon({focused}: {focused: boolean}) {
    return <TabIcon emoji={emoji} focused={focused} />;
  };

const homeIcon = tabIcon('🏠');
const discoverIcon = tabIcon('🧭');
const paymentIcon = tabIcon('💳');
const profileIcon = tabIcon('👤');

export function BottomTabs() {
  const theme = useTheme();
  const {t} = useTranslation();

  // Tab Thanh toán chỉ hiện khi người dùng có quyền — ẩn hẳn thay vì để họ bấm
  // vào rồi nhận 403.
  const canPay = useCan('pay', 'Payment');

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
        // Bàn phím đẩy tab bar lên giữa màn hình trên Android — luôn ẩn khi gõ.
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('nav.home'),
          tabBarIcon: homeIcon,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: t('nav.discover'),
          tabBarIcon: discoverIcon,
        }}
      />
      {canPay ? (
        <Tab.Screen
          name="Payment"
          component={PaymentNavigator}
          options={{
            title: t('nav.payment'),
            tabBarIcon: paymentIcon,
          }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('nav.profile'),
          tabBarIcon: profileIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {fontSize: 20},
});
