import { Switch, type SwitchProps } from 'react-native';

import { switchTheme } from '@/theme/switchTheme';

type ToggleSwitchProps = Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'> & {
  /** Track color when switched on. Defaults to admin primary. */
  accentColor?: string;
};

export function ToggleSwitch({
  accentColor = switchTheme.accentAdmin,
  ...props
}: ToggleSwitchProps) {
  return (
    <Switch
      trackColor={{ false: switchTheme.trackOff, true: accentColor }}
      thumbColor={switchTheme.thumb}
      ios_backgroundColor={switchTheme.iosBackgroundOff}
      {...props}
    />
  );
}
