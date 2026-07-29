module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  /**
   * Mặc định Jest bỏ qua toàn bộ node_modules khi transform. Nhưng phần lớn
   * thư viện React Native hiện đại publish ESM thuần (`export {...}`) mà Node
   * trong Jest không hiểu → `SyntaxError: Unexpected token 'export'`.
   *
   * Danh sách dưới đây là những gói base này thật sự dùng và cần được Babel
   * transform. Thêm gói mới mà test báo lỗi cú pháp thì bổ sung vào đây.
   */
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        '@react-native',
        'react-native',
        '@react-navigation',
        'react-native-mmkv',
        'react-native-nitro-modules',
        'react-native-reanimated',
        'react-native-worklets',
        'react-native-gesture-handler',
        'react-native-screens',
        'react-native-safe-area-context',
        'react-native-keychain',
        'react-native-fbsdk-next',
        '@react-native-google-signin',
        '@invertase/react-native-apple-authentication',
        '@react-native-clipboard',
      ].join('|') +
      ')/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
