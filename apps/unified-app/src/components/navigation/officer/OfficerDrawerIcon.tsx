import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const OFFICER_DRAWER_ICON_NAMES: Record<string, IconName> = {
  Dashboard: 'home-outline',
  RequestsStack: 'ticket-outline',
  Map: 'map-outline',
  Attendance: 'calendar-outline',
  CollectionsStack: 'wallet-outline',
  AssignedCustomers: 'cash-outline',
  Invoice: 'receipt-outline',
  Inventory: 'cube-outline',
  Payslip: 'card-outline',
  LeaveStack: 'leaf-outline',
  NotificationsStack: 'notifications-outline',
  Support: 'chatbubbles-outline',
  ProfileStack: 'person-outline',
};

type OfficerDrawerIconProps = {
  route: string;
  screen?: string;
  focused?: boolean;
  size?: number;
};

export function OfficerDrawerIcon({ route, screen, focused, size = 22 }: OfficerDrawerIconProps) {
  const key = screen ?? route;
  const name = OFFICER_DRAWER_ICON_NAMES[key] ?? OFFICER_DRAWER_ICON_NAMES[route] ?? 'ellipse-outline';
  return (
    <Ionicons
      name={name}
      size={size}
      color={focused ? adminColors.primary : colors.textSecondary}
    />
  );
}
