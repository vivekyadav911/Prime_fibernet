import { adminColors } from '@/theme/admin';

export const MAP_THEME = {
  primary: adminColors.primary,
  controlsBg: '#FFFFFF',
  controlsBorder: '#E5E7EB',
  panelShadow: 'rgba(0,0,0,0.12)',

  pillActive: adminColors.primary,
  pillActiveText: '#FFFFFF',
  pillInactive: '#F3F4F6',
  pillInactiveText: '#374151',

  officerColors: [
    '#F97316',
    '#8B5CF6',
    '#EC4899',
    '#10B981',
    '#3B82F6',
    '#EF4444',
    '#EAB308',
    '#06B6D4',
  ],

  trailStopped: '#9CA3AF',
  trailSlow: '#3B82F6',
  trailNormal: '#10B981',
  trailFast: '#F97316',

  statDistance: { bg: '#EFF6FF', value: '#3B82F6', icon: '#93C5FD' },
  statTimeActive: { bg: '#F0FDF4', value: '#10B981', icon: '#6EE7B7' },
  statStops: { bg: '#FFFBEB', value: '#F59E0B', icon: '#FCD34D' },
  statAvgSpeed: { bg: '#F5F3FF', value: '#8B5CF6', icon: '#C4B5FD' },

  dwellFill: 'rgba(245, 158, 11, 0.15)',
  dwellStroke: '#F59E0B',
} as const;

export function getOfficerColor(name: string, index?: number): string {
  if (index !== undefined) {
    return MAP_THEME.officerColors[index % MAP_THEME.officerColors.length]!;
  }
  const idx = name.charCodeAt(0) % MAP_THEME.officerColors.length;
  return MAP_THEME.officerColors[idx]!;
}

export function getOfficerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function getTrailColorForSpeed(speedMs: number | null): string {
  const speed = speedMs ?? 0;
  if (speed < 0.5) return MAP_THEME.trailStopped;
  if (speed < 2) return MAP_THEME.trailSlow;
  if (speed < 8) return MAP_THEME.trailNormal;
  return MAP_THEME.trailFast;
}
