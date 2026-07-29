// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Alias `@/...` -> `src/...`. Phải khai ở CẢ BA nơi cho khớp nhau:
    //   - babel.config.js  (runtime, Metro dùng)
    //   - tsconfig.json    (TypeScript hiểu đường dẫn)
    //   - jest.config.js   (moduleNameMapper)
    // Thiếu một trong ba là "chạy được nhưng tsc đỏ" hoặc ngược lại.
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {'@': './src'},
      },
    ],

    // react-native-worklets/plugin BẮT BUỘC nằm CUỐI danh sách để Reanimated 4
    // hoạt động. Đặt sai chỗ thì worklet im lặng chạy trên JS thread —
    // animation giật mà không có lỗi nào được in ra.
    'react-native-worklets/plugin',
  ],
};
