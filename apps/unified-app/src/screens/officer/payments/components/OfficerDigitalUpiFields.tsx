import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@prime/ui';

import type { BankAccountRecord } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { UpiQrDisplay } from './UpiQrDisplay';

export type DigitalSubMode = 'manual' | 'qr';

type Props = {
  amount: number;
  upiReference: string;
  onUpiReferenceChange: (value: string) => void;
  digitalSubMode: DigitalSubMode;
  onDigitalSubModeChange: (mode: DigitalSubMode) => void;
  showQr: boolean;
  onShowQr: () => void;
  bankAccounts: BankAccountRecord[];
  selectedBank: BankAccountRecord | null;
  onBankAccountSelect: (id: string) => void;
  onConfirmManual: () => void;
  onConfirmDigital: () => void;
  isLoading?: boolean;
  manualButtonLabel?: string;
  confirmDigitalButtonLabel?: string;
};

export function OfficerDigitalUpiFields({
  amount,
  upiReference,
  onUpiReferenceChange,
  digitalSubMode,
  onDigitalSubModeChange,
  showQr,
  onShowQr,
  bankAccounts,
  selectedBank,
  onBankAccountSelect,
  onConfirmManual,
  onConfirmDigital,
  isLoading = false,
  manualButtonLabel = 'Record UPI payment',
  confirmDigitalButtonLabel = 'Customer paid — confirm collection',
}: Props) {
  return (
    <>
      <Text style={styles.label}>UPI ENTRY MODE</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.subChip, digitalSubMode === 'manual' ? styles.subChipActive : null]}
          onPress={() => onDigitalSubModeChange('manual')}
        >
          <Text
            style={[
              styles.subChipLabel,
              digitalSubMode === 'manual' ? styles.subChipLabelActive : null,
            ]}
          >
            Enter transaction manually
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subChip, digitalSubMode === 'qr' ? styles.subChipActive : null]}
          onPress={() => onDigitalSubModeChange('qr')}
        >
          <Text
            style={[styles.subChipLabel, digitalSubMode === 'qr' ? styles.subChipLabelActive : null]}
          >
            Generate QR code
          </Text>
        </Pressable>
      </View>

      {digitalSubMode === 'qr' ? (
        <>
          <Text style={styles.label}>BANK ACCOUNT</Text>
          <View style={styles.ticketRow}>
            {bankAccounts.map((account) => {
              const active = (selectedBank?.id ?? '') === account.id;
              return (
                <Pressable
                  key={account.id}
                  style={[styles.ticketChip, active ? styles.ticketChipActive : null]}
                  onPress={() => onBankAccountSelect(account.id)}
                >
                  <Text style={[styles.ticketLabel, active ? styles.ticketLabelActive : null]}>
                    {account.nickname}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!showQr ? (
            <Button label="Show payment QR" onPress={onShowQr} />
          ) : selectedBank ? (
            <UpiQrDisplay
              vpa={selectedBank.upi_vpa}
              amount={amount}
              payeeName={selectedBank.nickname}
            />
          ) : null}
        </>
      ) : null}

      <Text style={styles.label}>UPI TRANSACTION REFERENCE / UTR</Text>
      <TextInput
        style={styles.input}
        value={upiReference}
        onChangeText={onUpiReferenceChange}
        placeholder="From customer's UPI confirmation"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
      />

      {digitalSubMode === 'manual' ? (
        <Button label={manualButtonLabel} onPress={onConfirmManual} disabled={isLoading} />
      ) : showQr ? (
        <Button
          label={confirmDigitalButtonLabel}
          onPress={onConfirmDigital}
          disabled={isLoading}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 15,
    color: colors.textPrimary,
  },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  subChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
  },
  subChipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  subChipLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  subChipLabelActive: { color: colors.primaryNavy },
  ticketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  ticketChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  ticketChipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  ticketLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  ticketLabelActive: { color: colors.primaryNavy },
});
