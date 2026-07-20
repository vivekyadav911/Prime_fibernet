import { StyleSheet, View } from 'react-native';

import { ShiftPulseChip } from '@/components/navigation/officer';
import { OfficerNotificationBell } from '@/components/navigation/officer/OfficerNotificationBell';
import { spacing } from '@/theme/spacing';

import { OfficerProfileButton } from './OfficerProfileButton';

type OfficerHeaderActionsProps = {
  showProfile?: boolean;
};

export function OfficerHeaderActions({ showProfile = false }: OfficerHeaderActionsProps) {
  return (
    <View style={styles.row}>
      {showProfile ? <OfficerProfileButton /> : null}
      <ShiftPulseChip />
      <OfficerNotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 1,
    maxWidth: '100%',
  },
});
