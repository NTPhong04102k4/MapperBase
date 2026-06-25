// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-worklets/plugin được yêu cầu để Reanimated 4 hoạt động (đảm bảo nằm cuối).
    'react-native-worklets/plugin',
  ],
};
