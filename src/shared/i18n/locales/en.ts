import type {TranslationSchema} from './vi';

// Kiểu `TranslationSchema` ép bản dịch tiếng Anh phải có ĐỦ key như tiếng Việt.
// Thêm key vào vi.ts mà quên en.ts thì TypeScript báo lỗi ngay, không đợi tới
// lúc QA phát hiện màn hình hiện ra chuỗi "payment.statusPaid".
export const en: TranslationSchema = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Retry',
    save: 'Save',
    continue: 'Continue',
    back: 'Back',
    loading: 'Loading…',
    search: 'Search',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    somethingWentWrong: 'Something went wrong',
  },

  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    username: 'Username',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    orContinueWith: 'Or continue with',
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
    biometricSignIn: 'Sign in with biometrics',
    biometricPromptTitle: 'Authenticate to continue',
    biometricPromptSubtitle: 'Use your fingerprint or face to unlock your session',
    signOutConfirm: 'Are you sure you want to sign out?',
    sessionExpired: 'Your session has expired. Please sign in again.',
    invalidCredentials: 'Incorrect username or password.',
    unsupportedJourneyStep:
      'This authentication step is not supported in the app yet. Please update to the latest version.',
  },

  biometric: {
    notEnrolled: 'No fingerprint or face is enrolled on this device. Add one in Settings.',
    noHardware: 'This device does not support biometrics.',
    lockedOut: 'Too many failed attempts. Use your device passcode, then try again.',
    keyInvalidated:
      'Your device biometrics changed, so the old security key was invalidated. Please re-enroll biometric authentication.',
    enrollTitle: 'Enable biometric confirmation',
    enrollDescription:
      'Once enabled, you can confirm transactions with your fingerprint or face instead of an OTP.',
    confirmTransactionTitle: 'Confirm transaction',
  },

  permission: {
    denied: 'You do not have permission to perform this action.',
    deniedTitle: 'Not allowed',
  },

  payment: {
    title: 'Payment',
    amount: 'Amount',
    scanToPay: 'Scan to pay',
    transferContent: 'Transfer description',
    bank: 'Bank',
    accountNumber: 'Account number',
    accountName: 'Account holder',
    copied: 'Copied',
    waitingTransfer: 'Waiting for transfer…',
    autoDetect: 'We detect the payment automatically — no further action needed.',
    expiresIn: 'Code expires in {{time}}',
    statusPending: 'Awaiting payment',
    statusPaid: 'Paid',
    statusExpired: 'Expired',
    statusFailed: 'Payment failed',
    statusCancelled: 'Cancelled',
    paidTitle: 'Payment successful',
    expiredTitle: 'Payment code expired',
    createOrder: 'Create payment',
    cancelOrder: 'Cancel payment',
    confirmWithBiometric: 'Confirm with biometrics',
  },

  widget: {
    title: 'Home screen widget',
    loginRequired: 'Sign in to see your data',
    updatedAt: 'Updated {{time}}',
    notInstalled: 'No widget on your home screen yet.',
  },

  nav: {
    home: 'Home',
    discover: 'Discover',
    payment: 'Payment',
    profile: 'Profile',
    settings: 'Settings',
    playground: 'Playground',
    about: 'About',
  },

  settings: {
    appearance: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    language: 'Language',
    languageVi: 'Tiếng Việt',
    languageEn: 'English',
  },

  about: {
    title: 'About this app',
    environment: 'Environment',
    version: 'Version',
    build: 'Build',
    commit: 'Commit',
  },

  error: {
    network: 'Cannot reach the server. Check your connection and try again.',
    timeout: 'The server took too long to respond. Please try again.',
    server: 'The server is having trouble. Please try again later.',
    unauthorized: 'Your session is not valid.',
    forbidden: 'You do not have access to this content.',
    notFound: 'Data not found.',
    unknown: 'An unknown error occurred.',
  },
};
