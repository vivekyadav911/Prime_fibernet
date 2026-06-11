import { colors } from '@/theme/colors';

export type PickerAccent = {
  accentColor: string;
  accentTint: string;
};

export const defaultPickerAccent: PickerAccent = {
  accentColor: colors.primaryNavy,
  accentTint: 'rgba(27, 58, 107, 0.08)',
};
