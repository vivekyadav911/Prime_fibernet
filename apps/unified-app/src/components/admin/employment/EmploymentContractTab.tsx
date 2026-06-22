import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { StatusBadge, useAdminPermission } from '@/components/admin';
import { EmptyState, SkeletonLoader } from '@/components/common';
import { useCompanyDefaults } from '@/hooks/useCompanyDefaults';
import { useContractPDF } from '@/hooks/useContractPDF';
import { useEmploymentContract } from '@/hooks/useEmploymentContract';
import type { Officer } from '@/types/api/officer';
import type { EmploymentContract } from '@/types/contract';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatCurrencyInr } from '@/utils/formatCurrency';
import { queryErrorMessage } from '@/utils/queryError';

type Props = {
  officerId: string;
  profile: Officer | undefined;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Fixed-term Contract',
  probation: 'Probation',
  intern: 'Internship',
};

const SIGNATURE_LABELS: Record<string, string> = {
  unsigned: 'Awaiting signatures',
  employee_signed: 'Employee signed',
  employer_signed: 'Company signed',
  fully_signed: 'Fully executed',
};

function buildRefNo(contract: EmploymentContract): string {
  const year = new Date(contract.dateOfJoining).getFullYear();
  return `EMP-${contract.officerId.slice(0, 8).toUpperCase()}-${year}`;
}

export function EmploymentContractTab({ officerId, profile }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AdminOfficersStackParamList>>();
  const canEdit = useAdminPermission('officers.edit');
  const { savedDefaults } = useCompanyDefaults();
  const {
    contract,
    isLoading,
    refetch,
    generateAndSaveContract,
    requestEmployeeSignature,
    finalizing,
    requestingSignature,
  } = useEmploymentContract(officerId);
  const { shareFromStoragePath, copySignedLink } = useContractPDF();

  const [busy, setBusy] = useState(false);

  const openPdf = useCallback(() => {
    if (!contract?.generatedPdfUrl) {
      Alert.alert('No PDF', 'Generate the contract PDF first from Edit Contract.');
      return;
    }
    navigation.navigate('ContractPdfViewer', {
      storagePath: contract.generatedPdfUrl,
      title: 'Employment Contract',
    });
  }, [contract, navigation]);

  const handleShare = useCallback(async () => {
    if (!contract?.generatedPdfUrl) return;
    try {
      setBusy(true);
      await shareFromStoragePath(contract.generatedPdfUrl, 'Employment Contract');
    } catch (e) {
      Alert.alert('Share failed', queryErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [contract, shareFromStoragePath]);

  const handleCopyLink = useCallback(async () => {
    if (!contract?.generatedPdfUrl) return;
    try {
      await copySignedLink(contract.generatedPdfUrl);
      Alert.alert('Copied', 'Signed link copied to clipboard (valid 7 days).');
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  }, [contract, copySignedLink]);

  const handleRegenerate = useCallback(async () => {
    if (!contract || !profile) return;
    Alert.alert(
      'Generate new PDF',
      'This will archive the current version and create a new PDF from saved contract fields.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            void (async () => {
              try {
                setBusy(true);
                const { contractToFormValues } = await import('@/types/contract');
                const values = contractToFormValues(contract);
                await generateAndSaveContract(values, contract, savedDefaults ?? null);
                await refetch();
                Alert.alert('Done', 'New contract PDF generated.');
              } catch (e) {
                Alert.alert('Error', queryErrorMessage(e));
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }, [contract, profile, generateAndSaveContract, refetch, savedDefaults]);

  const handleRequestSignature = useCallback(async () => {
    if (!contract) return;
    try {
      setBusy(true);
      await requestEmployeeSignature(contract.id);
      await refetch();
      Alert.alert('Sent', 'Signature request notification sent to the officer.');
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [contract, requestEmployeeSignature, refetch]);

  const handleSignForCompany = useCallback(() => {
    if (!contract) return;
    navigation.navigate('EmploymentContractSign', {
      contractId: contract.id,
      officerId,
      role: 'employer',
    });
  }, [contract, navigation, officerId]);

  if (isLoading) {
    return (
      <View style={styles.wrap}>
        <SkeletonLoader rows={6} />
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.wrap}>
        <EmptyState
          title="No employment contract"
          subtitle="Create a formal employment agreement for this officer with company terms, compensation, and signature workflow."
          actionLabel={canEdit ? 'Create Contract' : undefined}
          onAction={
            canEdit
              ? () => navigation.navigate('EmploymentContractForm', { officerId })
              : undefined
          }
        />
      </View>
    );
  }

  const employeeSigned = !!contract.employeeSignaturePath;
  const employerSigned = !!contract.employerSignaturePath;
  const hasPdf = !!contract.generatedPdfUrl;
  const refNo = buildRefNo(contract);

  return (
    <View style={styles.wrap}>
      {/* Letterhead-style header */}
      <View style={styles.letterhead}>
        <View style={styles.letterheadRule} />
        <Text style={styles.docType}>EMPLOYMENT CONTRACT</Text>
        <Text style={styles.docSubtitle}>Letter of Appointment</Text>
        <View style={styles.refRow}>
          <Text style={styles.refText}>Ref. {refNo}</Text>
          <Text style={styles.refDot}>·</Text>
          <Text style={styles.refText}>Version {contract.version}</Text>
        </View>
        <View style={styles.letterheadRule} />
      </View>

      {/* Status strip */}
      <View style={styles.statusStrip}>
        <StatusBadge status={contract.status} />
        <View style={styles.sigBadge}>
          <Text style={styles.sigBadgeText}>
            {SIGNATURE_LABELS[contract.signatureStatus] ?? contract.signatureStatus}
          </Text>
        </View>
      </View>

      {/* Parties */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PARTIES</Text>
        <View style={styles.partyCard}>
          <Text style={styles.partyRole}>Employer</Text>
          <Text style={styles.partyName}>{contract.companyName}</Text>
          <Text style={styles.partyDetail} numberOfLines={2}>{contract.companyAddress}</Text>
        </View>
        <View style={styles.partyCard}>
          <Text style={styles.partyRole}>Employee</Text>
          <Text style={styles.partyName}>{contract.employeeFullName}</Text>
          <Text style={styles.partyDetail}>{contract.employeeDesignation}</Text>
          {contract.employeeDepartment ? (
            <Text style={styles.partyDetail}>{contract.employeeDepartment}</Text>
          ) : null}
        </View>
      </View>

      {/* Key terms */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>KEY TERMS</Text>
        <View style={styles.termsGrid}>
          <TermCell label="Employment type" value={EMPLOYMENT_LABELS[contract.employmentType] ?? contract.employmentType} />
          <TermCell label="Date of joining" value={formatDate(contract.dateOfJoining)} />
          <TermCell label="Work location" value={contract.workLocation} />
          <TermCell label="Annual CTC" value={formatCurrencyInr(contract.ctcAnnual)} highlight />
        </View>
      </View>

      {/* Signatures */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>EXECUTION</Text>
        <View style={styles.sigRow}>
          <SignatureBlock
            party="Company"
            name={contract.authorizedSignatoryName}
            designation={contract.authorizedSignatoryDesignation}
            signed={employerSigned}
            signedAt={contract.employerSignedAt}
          />
          <View style={styles.sigDivider} />
          <SignatureBlock
            party="Employee"
            name={contract.employeeFullName}
            designation={contract.employeeDesignation}
            signed={employeeSigned}
            signedAt={contract.employeeSignedAt}
          />
        </View>
      </View>

      {/* PDF actions — primary */}
      {hasPdf ? (
        <View style={styles.pdfToolbar}>
          <Pressable
            style={[styles.pdfBtn, styles.pdfBtnPrimary, busy && styles.pdfBtnDisabled]}
            onPress={openPdf}
            disabled={busy}
          >
            <Text style={styles.pdfBtnPrimaryText}>View PDF</Text>
          </Pressable>
          <Pressable
            style={[styles.pdfBtn, styles.pdfBtnSecondary, busy && styles.pdfBtnDisabled]}
            onPress={() => void handleShare()}
            disabled={busy}
          >
            <Text style={styles.pdfBtnSecondaryText}>Share PDF</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Secondary actions */}
      <View style={styles.actions}>
        {canEdit ? (
          <Button
            label="Edit Contract"
            variant="secondary"
            onPress={() =>
              navigation.navigate('EmploymentContractForm', {
                officerId,
                contractId: contract.id,
              })
            }
          />
        ) : null}

        {!hasPdf && canEdit ? (
          <Button
            label="Generate PDF"
            onPress={() =>
              navigation.navigate('EmploymentContractForm', {
                officerId,
                contractId: contract.id,
              })
            }
          />
        ) : null}

        {hasPdf ? (
          <Pressable onPress={() => void handleCopyLink()} style={styles.linkBtn}>
            <Text style={styles.linkText}>Copy signed link (7 days)</Text>
          </Pressable>
        ) : null}

        {canEdit && hasPdf ? (
          <Button
            label={busy || finalizing ? 'Generating…' : 'Regenerate PDF'}
            variant="secondary"
            onPress={() => void handleRegenerate()}
            disabled={busy || finalizing}
          />
        ) : null}

        {canEdit && hasPdf && !employeeSigned ? (
          <Button
            label={requestingSignature || busy ? 'Sending…' : 'Request Employee Signature'}
            variant="secondary"
            onPress={() => void handleRequestSignature()}
            disabled={busy || requestingSignature}
          />
        ) : null}

        {canEdit && hasPdf && !employerSigned ? (
          <Button label="Sign for Company" onPress={handleSignForCompany} />
        ) : null}

        <Pressable
          onPress={() =>
            navigation.navigate('EmploymentContractVersionHistory', {
              contractId: contract.id,
              officerId,
            })
          }
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Version history →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TermCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.termCell}>
      <Text style={styles.termLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.termValue, highlight && styles.termValueHighlight]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function SignatureBlock({
  party,
  name,
  designation,
  signed,
  signedAt,
}: {
  party: string;
  name: string;
  designation: string;
  signed: boolean;
  signedAt: string | null;
}) {
  return (
    <View style={styles.sigBlock}>
      <Text style={styles.sigParty}>{party}</Text>
      <View style={[styles.sigLine, signed && styles.sigLineSigned]} />
      <Text style={styles.sigName}>{name}</Text>
      <Text style={styles.sigDesignation}>{designation}</Text>
      <Text style={[styles.sigStatus, signed && styles.sigStatusDone]}>
        {signed ? `Signed ${formatDate(signedAt)}` : 'Pending signature'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  letterhead: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    gap: spacing.xs,
  },
  letterheadRule: {
    width: '100%',
    height: 2,
    backgroundColor: adminColors.primary,
    opacity: 0.35,
  },
  docType: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    color: adminColors.primary,
    marginTop: spacing.sm,
  },
  docSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  refText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  refDot: { fontSize: 12, color: colors.textSecondary },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sigBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sigBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
  },
  partyCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: adminColors.primary,
    gap: spacing.xxs,
  },
  partyRole: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  partyName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  partyDetail: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  termCell: {
    width: '47%',
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
    minHeight: 72,
  },
  termLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  termValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  termValueHighlight: { color: adminColors.primary, fontSize: 15 },
  sigRow: {
    flexDirection: 'row',
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  sigDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
  },
  sigBlock: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  sigParty: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  sigLine: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: spacing.sm,
  },
  sigLineSigned: { backgroundColor: adminColors.primary },
  sigName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  sigDesignation: { fontSize: 12, color: colors.textSecondary },
  sigStatus: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs },
  sigStatusDone: { color: adminColors.primary },
  pdfToolbar: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pdfBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBtnPrimary: {
    backgroundColor: adminColors.primary,
  },
  pdfBtnSecondary: {
    backgroundColor: adminColors.cardBg,
    borderWidth: 1,
    borderColor: adminColors.primary,
  },
  pdfBtnDisabled: { opacity: 0.5 },
  pdfBtnPrimaryText: { color: colors.surfaceWhite, fontWeight: '700', fontSize: 15 },
  pdfBtnSecondaryText: { color: adminColors.primary, fontWeight: '700', fontSize: 15 },
  actions: { gap: spacing.sm },
  linkBtn: { alignSelf: 'flex-start', paddingVertical: spacing.xxs },
  linkText: { color: adminColors.primary, fontWeight: '600', fontSize: 14 },
});
