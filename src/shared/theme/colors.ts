// Bảng màu gốc lấy từ design-system/mapperbase/MASTER.md, bổ sung các token
// ngữ nghĩa (success/danger/overlay/…) mà UI thật cần.
//
// Quy tắc: component KHÔNG viết mã màu trực tiếp. Mọi màu đi qua token ở đây —
// nếu không, dark mode sẽ hỏng đúng ở những chỗ không ai kiểm tra.

export const lightColors = {
  primary: '#0D9488',
  primarySoft: '#CCFBF1',
  secondary: '#14B8A6',
  cta: '#F97316',

  background: '#F0FDFA',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  elevated: '#FFFFFF',

  text: '#134E4A',
  textMuted: '#475569',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  divider: '#EEF2F6',

  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#2563EB',
  infoSoft: '#DBEAFE',

  /** Nền mờ phía sau modal/drawer. */
  overlay: 'rgba(15, 31, 29, 0.45)',
  /** Nền skeleton khi đang tải. */
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  primary: '#14B8A6',
  primarySoft: '#134E4A',
  secondary: '#0D9488',
  cta: '#FB923C',

  background: '#0F1F1D',
  surface: '#16302C',
  surfaceAlt: '#132A27',
  elevated: '#1C3A35',

  text: '#ECFEFF',
  textMuted: '#94A3B8',
  textInverse: '#0F1F1D',

  border: '#264E48',
  divider: '#1F413C',

  success: '#4ADE80',
  successSoft: '#14532D',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  danger: '#F87171',
  dangerSoft: '#450A0A',
  info: '#60A5FA',
  infoSoft: '#172554',

  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#1F413C',
  skeletonHighlight: '#264E48',
};
