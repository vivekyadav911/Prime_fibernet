/** Admin panel design tokens — indigo/purple light theme */
export const adminColors = {
  primary: '#5B4FE9',
  primaryLight: '#7B6FE8',
  primaryTint: 'rgba(91, 79, 233, 0.08)',
  sidebarBg: '#FFFFFF',
  canvasBg: '#F4F5F7',
  cardBg: '#FFFFFF',
  activeBorder: '#5B4FCF',
  sectionLabel: '#9CA3AF',
  badgePending: '#F59E0B',
  badgeActive: '#10B981',
  badgeBlocked: '#EF4444',
  badgeWarning: '#EAB308',
  badgeDanger: '#DC2626',
  deleteIcon: '#EF5350',
  sectionIconBlue: '#1565C0',
  sectionIconTeal: '#0D7377',
  permissionBoxBg: '#F3F0FF',
  permissionBoxBorder: '#5B4FCF',
  salaryTotal: '#1A6B3A',
  /** Gmail-style drawer notification pills (light theme) */
  navPillPrimaryBg: '#E8E4FF',
  navPillPrimaryText: '#5B4FCF',
  navPillWarningBg: '#FEF3C7',
  navPillWarningText: '#B45309',
  navPillDangerBg: '#FEE2E2',
  navPillDangerText: '#DC2626',
  navPillSuccessBg: '#D1FAE5',
  navPillSuccessText: '#047857',
  /** KPI metric tile surfaces — muted telecom accents */
  kpiSurfaces: {
    blue: { bg: '#F5F6F8', icon: '#E8EAED', accent: '#1E4976' },
    purple: { bg: '#F5F4F8', icon: '#E9E7EF', accent: '#4338CA' },
    amber: { bg: '#F6F5F3', icon: '#EBE8E3', accent: '#92400E' },
    teal: { bg: '#F4F6F6', icon: '#E5EAEA', accent: '#115E59' },
    neutral: { bg: '#F6F7F9', icon: '#EBEDF0', accent: '#374151' },
  },
  /** ISP operations dashboard — control-center surfaces */
  dashboard: {
    canvasBg: '#E4E7EC',
    headerBg: '#312E81',
    headerBgEnd: '#3730A3',
    panelBorder: '#CDD2D9',
    surfacePastel: '#F4F5F8',
    metricBg: '#ECEEF2',
    metricBgPrimary: '#FFFFFF',
    metricBgSecondary: '#E8EAEF',
    primaryMetricTint: '#F6F5FC',
    alertBg: '#FFFFFF',
    rowDivider: '#DDE1E8',
    sectionGap: 10,
    kpiUrgentBg: '#FBF6EE',
    kpiUrgentBorder: '#E5D5B8',
    kpiTrendUpBg: '#EEFBF4',
    kpiTrendUpBorder: '#9FD9B8',
    kpiTrendDownBg: '#FDF0F0',
    kpiTrendDownBorder: '#F5B8B8',
    ctaBg: '#F3F1FD',
    ctaBorder: '#C9C2F0',
    ctaPressedBg: '#E8E4FF',
    heroTitle: '#1F2937',
    actionCriticalBg: '#FEF5F5',
    actionWarningBg: '#FFFBF2',
    actionInfoBg: '#F5F4FD',
  },
  fieldStatus: {
    onField: { bg: '#E8F5E9', text: '#2E7D32' },
    busy: { bg: '#FCE4EC', text: '#C62828' },
    available: { bg: '#E3F2FD', text: '#1565C0' },
    offline: { bg: '#F5F5F5', text: '#616161' },
  },
  /** Semantic chip / badge surfaces — use instead of inline hex on screens */
  chipTones: {
    success: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    warning: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    error: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    info: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    neutral: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
    primary: { bg: 'rgba(91, 79, 233, 0.08)', text: '#5B4FE9', border: '#C9C2F0' },
  },
  /** Muted row / table header backgrounds */
  surfaceMuted: '#F9FAFB',
  /** Dark indigo CTA (inventory add buttons) */
  ctaDark: '#1E1B4B',
  /** Inventory KPI stat card accents */
  inventoryStat: {
    total: { iconColor: '#3B82F6', iconBgColor: '#EFF6FF', valueColor: '#3B82F6' },
    stock: { iconColor: '#10B981', iconBgColor: '#F0FDF4', valueColor: '#10B981' },
    low: { iconColor: '#F59E0B', iconBgColor: '#FFFBEB', valueColor: '#F59E0B' },
    out: { iconColor: '#EF4444', iconBgColor: '#FEF2F2', valueColor: '#EF4444' },
  },
  /** Live attendance KPI cell backgrounds */
  attendanceKpiCell: {
    present: '#F8FDFB',
    absent: '#FEF8F8',
    late: '#FFFCF5',
  },
  /** Attendance records calendar day cell fills */
  attendanceCalendarCell: {
    present: '#1a4731',
    absent: '#7f1d1d',
    late: '#92400e',
    half_day: '#134e4a',
    on_leave: '#1e3a5f',
    holiday: '#E5E7EB',
    not_yet_recorded: '#F9FAFB',
    weekendEmpty: '#F3F4F6',
    empty: '#FFFFFF',
    densityPresent: '#22C55E',
    densityAbsent: '#EF4444',
    densityLate: '#F59E0B',
    densityHalfDay: '#0D9488',
    densityOnLeave: '#3B82F6',
    densityHoliday: '#9CA3AF',
  },
  /** Live attendance KPI cell backgrounds — extended canonical breakdown */
  attendanceKpiExtended: {
    halfDay: '#F0FDFA',
    onLeave: '#EFF6FF',
    holiday: '#F9FAFB',
  },
  /** Notification hub — sent tab and FAB */
  notificationHub: {
    sentTabBg: '#3B3F8C',
  },
} as const;

/** Gmail-style drawer: ~78% of screen on mobile, fixed width on desktop sidebar */
export const adminDrawerWidthRatio = 0.78;
export const adminDrawerWidthMax = 320;
export const adminDrawerWidthWeb = 280;

export function getAdminDrawerWidth(screenWidth: number, isPermanentSidebar = false): number {
  if (isPermanentSidebar) return adminDrawerWidthWeb;
  return Math.min(Math.round(screenWidth * adminDrawerWidthRatio), adminDrawerWidthMax);
}

/** @deprecated Use getAdminDrawerWidth — kept for any legacy imports */
export const adminDrawerWidth = adminDrawerWidthWeb;
