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
  fieldStatus: {
    onField: { bg: '#E8F5E9', text: '#2E7D32' },
    busy: { bg: '#FCE4EC', text: '#C62828' },
    available: { bg: '#E3F2FD', text: '#1565C0' },
    offline: { bg: '#F5F5F5', text: '#616161' },
  },
} as const;

/** Sidebar width — kept narrow so menu content fills the panel on mobile */
export const adminDrawerWidth = 264;
