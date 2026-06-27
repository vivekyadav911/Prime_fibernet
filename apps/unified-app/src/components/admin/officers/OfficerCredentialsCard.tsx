import { Alert, StyleSheet, Text, View } from 'react-native';

import { AdminButton } from '../AdminButton';
import type { OfficerCredentialsInfo } from '@/types/api/officer';
import { officerStrings } from '@/constants/officerStrings';
import { SectionHeader } from './SectionHeader';
import { InfoRow } from './InfoRow';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type OfficerCredentialsCardProps = {
  credentials: OfficerCredentialsInfo | null;
  onReveal?: () => void;
  onReset?: () => void;
  revealing?: boolean;
  resetting?: boolean;
};

export function OfficerCredentialsCard({
  credentials,
  onReveal,
  onReset,
  revealing,
  resetting,
}: OfficerCredentialsCardProps) {
  if (!credentials) {
    return (
      <View style={styles.card}>
        <SectionHeader icon="🔐" title={officerStrings.detail.sections.credentials} />
        <Text style={styles.hint}>No credential record for this officer.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <SectionHeader icon="🔐" title={officerStrings.detail.sections.credentials} />
      <InfoRow label={officerStrings.detail.labels.loginEmail} value={credentials.loginEmail} />
      <InfoRow
        label={officerStrings.detail.labels.passwordMethod}
        value={credentials.passwordSetMethod === 'auto' ? 'Auto-generated' : 'Manual'}
      />
      <InfoRow
        label={officerStrings.detail.labels.allowAdminView}
        value={credentials.visibleToAdmin ? officerStrings.detail.yes : officerStrings.detail.no}
      />
      <View style={styles.actions}>
        {credentials.visibleToAdmin && onReveal ? (
          <AdminButton
            label={revealing ? 'Revealing…' : officerStrings.detail.labels.revealPassword}
            variant="ghost"
            onPress={() => void onReveal()}
          />
        ) : null}
        {onReset ? (
          <AdminButton
            label={resetting ? 'Resetting…' : officerStrings.detail.labels.resetPassword}
            onPress={() => {
              Alert.alert(
                'Reset password',
                'Generate a new password for this officer?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', onPress: () => void onReset() },
                ],
              );
            }}
          />
        ) : null}
      </View>
      {!credentials.visibleToAdmin ? (
        <Text style={styles.hint}>
          Password viewing is disabled for this officer. Use Reset to generate a new password.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
});
