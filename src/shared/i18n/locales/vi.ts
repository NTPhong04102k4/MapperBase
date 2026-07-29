export const vi = {
  common: {
    ok: 'Đồng ý',
    cancel: 'Huỷ',
    close: 'Đóng',
    retry: 'Thử lại',
    save: 'Lưu',
    continue: 'Tiếp tục',
    back: 'Quay lại',
    loading: 'Đang tải…',
    search: 'Tìm kiếm',
    yes: 'Có',
    no: 'Không',
    confirm: 'Xác nhận',
    somethingWentWrong: 'Có lỗi xảy ra',
  },

  auth: {
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    orContinueWith: 'Hoặc tiếp tục với',
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
    biometricSignIn: 'Đăng nhập bằng sinh trắc học',
    biometricPromptTitle: 'Xác thực để tiếp tục',
    biometricPromptSubtitle: 'Dùng vân tay hoặc khuôn mặt để mở phiên làm việc',
    signOutConfirm: 'Bạn chắc chắn muốn đăng xuất?',
    sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    invalidCredentials: 'Tên đăng nhập hoặc mật khẩu không đúng.',
    unsupportedJourneyStep:
      'Bước xác thực này chưa được hỗ trợ trên ứng dụng. Vui lòng cập nhật phiên bản mới nhất.',
  },

  biometric: {
    notEnrolled: 'Thiết bị chưa đăng ký vân tay hoặc khuôn mặt. Vào Cài đặt để thêm.',
    noHardware: 'Thiết bị không hỗ trợ sinh trắc học.',
    lockedOut: 'Đã thử sai quá nhiều lần. Vui lòng dùng mật khẩu thiết bị rồi thử lại.',
    keyInvalidated:
      'Danh sách vân tay/khuôn mặt trên máy đã thay đổi nên khoá bảo mật cũ bị huỷ. Vui lòng đăng ký lại xác thực sinh trắc học.',
    enrollTitle: 'Bật xác nhận bằng sinh trắc học',
    enrollDescription:
      'Sau khi bật, bạn có thể xác nhận giao dịch bằng vân tay hoặc khuôn mặt thay vì nhập mã OTP.',
    confirmTransactionTitle: 'Xác nhận giao dịch',
  },

  permission: {
    denied: 'Bạn không có quyền thực hiện thao tác này.',
    deniedTitle: 'Không đủ quyền',
  },

  payment: {
    title: 'Thanh toán',
    amount: 'Số tiền',
    scanToPay: 'Quét mã để thanh toán',
    transferContent: 'Nội dung chuyển khoản',
    bank: 'Ngân hàng',
    accountNumber: 'Số tài khoản',
    accountName: 'Chủ tài khoản',
    copied: 'Đã sao chép',
    waitingTransfer: 'Đang chờ chuyển khoản…',
    autoDetect: 'Hệ thống tự động nhận khi tiền về, bạn không cần bấm gì thêm.',
    expiresIn: 'Mã hết hạn sau {{time}}',
    statusPending: 'Chờ thanh toán',
    statusPaid: 'Đã thanh toán',
    statusExpired: 'Đã hết hạn',
    statusFailed: 'Thanh toán thất bại',
    statusCancelled: 'Đã huỷ',
    paidTitle: 'Thanh toán thành công',
    expiredTitle: 'Mã thanh toán đã hết hạn',
    createOrder: 'Tạo đơn thanh toán',
    cancelOrder: 'Huỷ đơn',
    confirmWithBiometric: 'Xác nhận bằng sinh trắc học',
  },

  widget: {
    title: 'Widget màn hình chính',
    loginRequired: 'Đăng nhập để xem thông tin',
    updatedAt: 'Cập nhật {{time}}',
    notInstalled: 'Chưa có widget nào trên màn hình chính.',
  },

  nav: {
    home: 'Trang chủ',
    discover: 'Khám phá',
    payment: 'Thanh toán',
    profile: 'Cá nhân',
    settings: 'Cài đặt',
    playground: 'Thử nghiệm',
    about: 'Giới thiệu',
  },

  settings: {
    appearance: 'Giao diện',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    themeSystem: 'Theo hệ thống',
    language: 'Ngôn ngữ',
    languageVi: 'Tiếng Việt',
    languageEn: 'English',
  },

  about: {
    title: 'Thông tin ứng dụng',
    environment: 'Môi trường',
    version: 'Phiên bản',
    build: 'Build',
    commit: 'Commit',
  },

  error: {
    network: 'Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.',
    timeout: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
    server: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
    unauthorized: 'Phiên đăng nhập không hợp lệ.',
    forbidden: 'Bạn không có quyền truy cập nội dung này.',
    notFound: 'Không tìm thấy dữ liệu.',
    unknown: 'Đã có lỗi không xác định.',
  },
};

export type TranslationSchema = typeof vi;
