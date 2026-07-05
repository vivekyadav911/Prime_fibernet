import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { CustomerAppearance } from './index';

export type AppearanceOption = {
  id: CustomerAppearance;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export const APPEARANCE_OPTIONS: AppearanceOption[] = [
  {
    id: 'dark',
    title: 'Signal Glass',
    subtitle: 'Dark glass theme with Hanken Grotesk',
    icon: 'moon-waning-crescent',
  },
  {
    id: 'light',
    title: 'Prime Light',
    subtitle: 'Light broadband theme with the same layout as Signal Glass',
    icon: 'white-balance-sunny',
  },
];
