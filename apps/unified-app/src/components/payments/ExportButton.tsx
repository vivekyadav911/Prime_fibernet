import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useExportPaymentsV2Mutation } from '@/services/api/paymentCollectionApi';
import type { PaymentFilters } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { downloadOrShareUrl } from '@/utils/shareFile';
import { queryErrorMessage } from '@/utils/queryError';

type Props = { filters?: PaymentFilters };

export function ExportButton({ filters }: Props) {
  const [exportPayments, { isLoading }] = useExportPaymentsV2Mutation();
  const [open, setOpen] = useState(false);

  const runExport = async (format: 'xlsx' | 'pdf') => {
    setOpen(false);
    try {
      // Edge function maps pdf → honest HTML report (was previously a fake PDF).
      const result = await exportPayments({
        filters,
        format: format === 'pdf' ? 'pdf' : 'xlsx',
      }).unwrap();
      if (!result?.url) {
        throw new Error('Export returned no download URL');
      }
      await downloadOrShareUrl(result.url, result.filename);
    } catch (e) {
      Alert.alert('Export failed', queryErrorMessage(e));
    }
  };

  return (
    <>
      <Pressable style={styles.btn} onPress={() => setOpen((v) => !v)} disabled={isLoading}>
        <Text style={styles.btnText}>{isLoading ? 'Exporting…' : 'Export ▾'}</Text>
      </Pressable>
      {open ? (
        <>
          <Pressable style={styles.option} onPress={() => runExport('xlsx')}>
            <Text style={styles.optionText}>Excel (.xlsx)</Text>
          </Pressable>
          <Pressable style={styles.option} onPress={() => runExport('pdf')}>
            <Text style={styles.optionText}>HTML report</Text>
          </Pressable>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: adminColors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  btnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  option: {
    padding: spacing.sm,
    backgroundColor: adminColors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  optionText: { color: colors.textPrimary, fontSize: 13 },
});
