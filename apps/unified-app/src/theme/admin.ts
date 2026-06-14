/** Admin panel design tokens — indigo/purple light theme */
export const adminColors = {
  primary: '#5B4FCF',
  primaryLight: '#7B6FE8',
  primaryTint: 'rgba(91, 79, 207, 0.08)',
  sidebarBg: '#FFFFFF',
  canvasBg: '#F5F6FA',
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
