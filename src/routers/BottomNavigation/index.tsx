import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Home from '../../pages/home';
import Profiles from '../../pages/profiles';
import Discovery from '../../pages/discover';

const initialRouteNameDefault = 'Home';

// Khai báo Stack Navigation tĩnh
export const DrawerNavigation = createNativeStackNavigator({
  initialRouteName: initialRouteNameDefault,
  screens: {
    Home: {
      screen: Home,
      options: {
        title: 'Trang chủ',
      },
    },
    Personal: {
      screen: Profiles,
      options: {
        title: 'Hồ sơ cá nhân',
      },
    },
    Discovery: {
      screen: Discovery,
      options: {
        title: 'Khám phá',
      },
    },
  },
});
