import type {NavigatorScreenParams} from '@react-navigation/native';

export type BottomTabParamList = {
  Home: undefined;
  Discover: undefined;
  Payment: NavigatorScreenParams<PaymentStackParamList>;
  Profile: undefined;
};

export type PaymentStackParamList = {
  Checkout: {orderRef?: string; amount?: number} | undefined;
  PaymentResult: {orderId: string};
  PaymentHistory: undefined;
};

export type DrawerParamList = {
  Tabs: NavigatorScreenParams<BottomTabParamList>;
  Playground: undefined;
  Settings: undefined;
  About: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  /** Có phiên nhưng bị khoá bằng sinh trắc học. */
  Unlock: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<DrawerParamList>;
};

/**
 * Khai báo global cho `useNavigation()` không cần generic ở mọi chỗ gọi.
 * Thiếu block này thì `navigation.navigate('Home')` không được kiểm kiểu.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Interface rỗng là ĐÚNG ở đây: đây là declaration merging của React
    // Navigation, mục đích là bơm param list của app vào interface có sẵn của
    // thư viện — không phải một type thừa.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
