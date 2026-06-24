import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import {
  DocumentRow,
  DocumentViewerModal,
  InfoRow,
  OfficerCredentialsCard,
  PermissionPills,
  RoleGuard,
  SectionHeader,
  StatusBadge,
  openDocumentUrl,
} from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { officerStrings } from '@/constants/officerStrings';
import {
  useDeleteOfficerDocumentMutation,
  useGetAdminOfficerDetailQuery,
  useGetOfficerContractQuery,
  useGetOfficerDocumentsQuery,
  useGetOfficerProfileQuery,
  useGetOfficerRolePermissionsQuery,
  useRevealOfficerPasswordMutation,
  useResetOfficerPasswordMutation,
  useUploadOfficerDocumentMutation,
} from '@/store/api/endpoints';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import {
  OFFICER_DOCUMENT_DEFINITIONS,
  maskAccountNumber,
} from '@/types/api/officer';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  pickOfficerDocument,
  pickOfficerImage,
  uploadOfficerDocumentForOfficer,
  type OfficerDocumentType,
} from '@/utils/uploadOfficerDocument';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'OfficerDetail'>;

type DetailTab = 'onboarding' | 'contract' | 'documents';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return officerStrings.detail.na;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB');
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return officerStrings.detail.na;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function OfficerDetailScreen({ route, navigation }: Props) {
  const { officerId } = route.params;
  const [tab, setTab] = useState<DetailTab>('onboarding');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerMime, setViewerMime] = useState<string | null>(null);

  const { data: summary, isLoading, isError, error, refetch } = useGetAdminOfficerDetailQuery(officerId);
  const { data: profile } = useGetOfficerProfileQuery(officerId);
  const { data: contract } = useGetOfficerContractQuery(officerId, { skip: tab !== 'contract' });
  const { data: documents } = useGetOfficerDocumentsQuery(officerId, { skip: tab !== 'documents' });
  const { data: permissions = [] } = useGetOfficerRolePermissionsQuery(profile?.roleId ?? '', {
    skip: !profile?.roleId,
  });

  const [revealPassword, { isLoading: revealing }] = useRevealOfficerPasswordMutation();
  const [resetPassword, { isLoading: resetting }] = useResetOfficerPasswordMutation();
  const [uploadDoc] = useUploadOfficerDocumentMutation();
  const [deleteDoc] = useDeleteOfficerDocumentMutation();

  const tabs = useMemo(
    () =>
      [
        { key: 'onboarding' as const, label: officerStrings.detail.tabs.onboarding },
        { key: 'contract' as const, label: officerStrings.detail.tabs.contract },
        { key: 'documents' as const, label: officerStrings.detail.tabs.documents },
      ] as const,
    [],
  );

  const handleReveal = useCallback(async () => {
    try {
      const result = await revealPassword({ officerId }).unwrap();
      Alert.alert(
        'Credentials',
        `Email: ${result.loginEmail}\nPassword: ${result.password}`,
      );
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  }, [officerId, revealPassword]);

  const handleReset = useCallback(async () => {
    try {
      const result = await resetPassword({ officerId }).unwrap();
      Alert.alert(
        'Password reset',
        `New password (save now):\nEmail: ${result.loginEmail}\nPassword: ${result.password}`,
      );
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  }, [officerId, resetPassword]);

  const handleReplaceDoc = useCallback(
    async (dbType: string, label: string) => {
      try {
        const isPhoto = dbType.includes('photo') || dbType === 'profile_photo';
        const picked = isPhoto ? await pickOfficerImage() : await pickOfficerDocument();
        if (!picked) return;
        const url = await uploadOfficerDocumentForOfficer(
          officerId,
          dbType as OfficerDocumentType,
          picked,
        );
        await uploadDoc({
          officerId,
          documentType: dbType,
          fileUrl: url,
          mimeType: picked.mimeType,
        }).unwrap();
        Alert.alert('Uploaded', `${label} updated.`);
      } catch (e) {
        Alert.alert('Upload failed', queryErrorMessage(e));
      }
    },
    [officerId, uploadDoc],
  );

  if (isLoading) return <Screen safeAreaTop><SkeletonLoader rows={8} showAvatar /></Screen>;
  if (isError || !summary) return <Screen safeAreaTop><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  const p = profile;

  return (
    <RoleGuard requiredPermission="officers.view">
      <Screen padded={false} safeAreaTop style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{summary.name}</Text>
          <Pressable
            onPress={() => navigation.navigate('OfficerEdit', { officerId })}
            hitSlop={8}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </Pressable>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              {tab === t.key ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'onboarding' && !p ? (
            <View style={styles.card}>
              <Text style={styles.emptyTab}>Loading profile…</Text>
            </View>
          ) : null}
          {tab === 'onboarding' && p ? (
            <>
              <View style={styles.card}>
                <SectionHeader
                  icon="🛡"
                  title={officerStrings.detail.sections.roleAssignment}
                  onEdit={() => navigation.navigate('OfficerEdit', { officerId, section: 'role' })}
                />
                <InfoRow label={officerStrings.detail.labels.assignedRole} value={p.role ?? officerStrings.detail.na} />
                <InfoRow
                  label={officerStrings.detail.labels.joiningDate}
                  value={formatDate(p.joiningDate)}
                />
                <PermissionPills roleName={p.role ?? 'Role'} permissions={permissions.length ? permissions : p.permissions} />
              </View>

              <View style={styles.card}>
                <SectionHeader
                  icon="📋"
                  title={officerStrings.detail.sections.onboardingDetails}
                  onEdit={() => navigation.navigate('OfficerEdit', { officerId, section: 'personal' })}
                />
                <SectionHeader icon="👤" title={officerStrings.detail.sections.personalInfo} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.fullName} value={p.fullName} />
                <InfoRow label={officerStrings.detail.labels.dateOfBirth} value={formatDate(p.dateOfBirth)} />
                <InfoRow label={officerStrings.detail.labels.gender} value={p.gender ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.bloodGroup} value={p.bloodGroup ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.maritalStatus} value={p.maritalStatus ?? officerStrings.detail.na} />

                <SectionHeader icon="📇" title={officerStrings.detail.sections.contactInfo} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.email} value={p.email} />
                <InfoRow label={officerStrings.detail.labels.phone} value={p.phone} />
                <InfoRow label={officerStrings.detail.labels.alternatePhone} value={p.alternatePhone ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.currentAddress} value={p.currentAddress ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.permanentAddress} value={p.permanentAddress ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.city} value={p.city ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.state} value={p.state ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.pincode} value={p.pincode ?? officerStrings.detail.na} />

                <SectionHeader icon="🏦" title={officerStrings.detail.sections.bankDetails} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.bankName} value={p.bankDetails.bankName ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.accountHolder} value={p.bankDetails.accountHolderName ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.accountNumber} value={maskAccountNumber(p.bankDetails.accountNumber)} />
                <InfoRow label={officerStrings.detail.labels.ifsc} value={p.bankDetails.ifscCode ?? officerStrings.detail.na} />

                <SectionHeader icon="🆘" title={officerStrings.detail.sections.emergencyContacts} iconColor={adminColors.badgeWarning} />
                {p.emergencyContacts.map((ec, i) => (
                  <View key={i} style={styles.ecBlock}>
                    <Text style={styles.ecTitle}>{officerStrings.detail.labels.emergencyContact(i + 1)}</Text>
                    <InfoRow label="Name" value={ec.name || officerStrings.detail.na} />
                    <InfoRow label={officerStrings.detail.labels.relationship} value={ec.relationship || officerStrings.detail.na} />
                    <InfoRow label="Phone" value={ec.phone || officerStrings.detail.na} />
                    <InfoRow label={officerStrings.detail.labels.address} value={ec.address || officerStrings.detail.na} />
                  </View>
                ))}

                <SectionHeader icon="🎓" title={officerStrings.detail.sections.education} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.highestQualification} value={p.education.highestQualification ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.university} value={p.education.university ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.graduationYear} value={p.education.graduationYear ?? officerStrings.detail.na} />

                <SectionHeader icon="ℹ️" title={officerStrings.detail.sections.backgroundInfo} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.criminalRecord} value={p.backgroundInfo.criminalRecord ? officerStrings.detail.yes : officerStrings.detail.no} />
                <InfoRow label={officerStrings.detail.labels.healthIssues} value={p.backgroundInfo.healthIssues ? officerStrings.detail.yes : officerStrings.detail.no} />
                {p.backgroundInfo.details ? (
                  <InfoRow label={officerStrings.detail.labels.details} value={p.backgroundInfo.details} />
                ) : null}

                <SectionHeader icon="💼" title={officerStrings.detail.sections.positionExpectations} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.positionApplied} value={p.positionApplied ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.expectedSalary} value={formatCurrency(p.expectedSalary)} />
                <InfoRow label={officerStrings.detail.labels.joiningPreference} value={formatDate(p.joiningDatePreference)} />
              </View>

              <OfficerCredentialsCard
                credentials={p.credentials}
                onReveal={() => void handleReveal()}
                onReset={() => void handleReset()}
                revealing={revealing}
                resetting={resetting}
              />
            </>
          ) : null}

          {tab === 'contract' ? (
            contract ? (
              <View style={styles.card}>
                <SectionHeader
                  icon="📄"
                  title={officerStrings.detail.sections.contractDetails}
                  onEdit={() => navigation.navigate('OfficerEdit', { officerId, section: 'contract' })}
                />
                <SectionHeader icon="📃" title={officerStrings.detail.sections.contractInfo} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.contractNumber} value={contract.contractNumber ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.contractType} value={contract.contractType} />
                <View style={styles.statusRow}>
                  <Text style={styles.rowLabel}>STATUS</Text>
                  <StatusBadge status={contract.status.toLowerCase()} />
                </View>
                <InfoRow label={officerStrings.detail.labels.startDate} value={formatDate(contract.startDate)} />

                <SectionHeader icon="💼" title={officerStrings.detail.sections.employmentDetails} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.position} value={contract.position ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.designation} value={contract.designation ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.department} value={contract.department ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.reportingTo} value={contract.reportingTo ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.workLocation} value={contract.workLocation ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.workingHours} value={contract.workingHoursPerDay?.toString() ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.weeklyOff} value={contract.weeklyOffDays?.toString() ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.leaveEntitlement} value={contract.leaveEntitlementPerYear?.toString() ?? officerStrings.detail.na} />

                <SectionHeader icon="₹" title={officerStrings.detail.sections.salaryBreakdown} iconColor={adminColors.sectionIconTeal} />
                <InfoRow label={officerStrings.detail.labels.basicSalary} value={formatCurrency(contract.salary.basic)} />
                <InfoRow label={officerStrings.detail.labels.hra} value={formatCurrency(contract.salary.hra)} />
                <InfoRow label={officerStrings.detail.labels.transport} value={formatCurrency(contract.salary.transportAllowance)} />
                <InfoRow label={officerStrings.detail.labels.otherAllowances} value={formatCurrency(contract.salary.otherAllowances)} />
                <Text style={styles.totalSalary}>
                  {formatCurrency(contract.salary.total)}{officerStrings.detail.labels.perMonth}
                </Text>

                <SectionHeader icon="🏦" title={officerStrings.detail.sections.bankPayout} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.bankName} value={contract.bankDetails.bankName ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.accountHolder} value={contract.bankDetails.accountHolderName ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.accountNumber} value={contract.bankDetails.accountNumber ?? officerStrings.detail.na} />
                <InfoRow label={officerStrings.detail.labels.ifsc} value={contract.bankDetails.ifscCode ?? officerStrings.detail.na} />

                <SectionHeader icon="🎁" title={officerStrings.detail.sections.benefits} iconColor={adminColors.sectionIconBlue} />
                <InfoRow label={officerStrings.detail.labels.healthInsurance} value={contract.benefits.healthInsurance ? officerStrings.detail.yes : officerStrings.detail.no} />
                <InfoRow label={officerStrings.detail.labels.pfApplicable} value={contract.benefits.pfApplicable ? officerStrings.detail.yes : officerStrings.detail.no} />
                <InfoRow label={officerStrings.detail.labels.esicApplicable} value={contract.benefits.esicApplicable ? officerStrings.detail.yes : officerStrings.detail.no} />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.emptyTab}>No contract on file.</Text>
                <Pressable onPress={() => navigation.navigate('OfficerEdit', { officerId, section: 'contract' })}>
                  <Text style={styles.link}>Add contract details</Text>
                </Pressable>
              </View>
            )
          ) : null}

          {tab === 'documents' ? (
            <View style={styles.card}>
              {(documents ?? []).map((doc) => {
                const def = OFFICER_DOCUMENT_DEFINITIONS.find((d) => d.type === doc.type);
                const dbType = def?.dbType ?? doc.type.toLowerCase();
                return (
                  <DocumentRow
                    key={doc.type}
                    document={doc}
                    onView={
                      doc.url
                        ? () => {
                            setViewerUrl(doc.url ?? null);
                            setViewerTitle(doc.label);
                            setViewerMime(doc.mimeType ?? null);
                          }
                        : undefined
                    }
                    onDownload={doc.url ? () => void openDocumentUrl(doc.url!) : undefined}
                    onReplace={() => void handleReplaceDoc(dbType, doc.label)}
                    onDelete={
                      doc.status === 'uploaded' && doc.id && !doc.id.startsWith('PHOTO')
                        ? () => void deleteDoc({ officerId, documentId: doc.id }).unwrap().catch((e) =>
                            Alert.alert('Error', queryErrorMessage(e)),
                          )
                        : undefined
                    }
                  />
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <DocumentViewerModal
          visible={!!viewerUrl}
          url={viewerUrl}
          title={viewerTitle}
          mimeType={viewerMime}
          onClose={() => setViewerUrl(null)}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adminColors.canvasBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: adminColors.cardBg,
    gap: spacing.sm,
  },
  back: { fontSize: 22, color: colors.textPrimary },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  menuIcon: { fontSize: 22, color: colors.textSecondary, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: adminColors.cardBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  tabLabelActive: { color: adminColors.primary, fontWeight: '700' },
  tabIndicator: {
    marginTop: spacing.xxs,
    height: 3,
    width: '60%',
    backgroundColor: adminColors.primary,
    borderRadius: 2,
  },
  content: { paddingVertical: spacing.sm, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  ecBlock: { marginBottom: spacing.sm },
  ecTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xxs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxs },
  rowLabel: { width: 120, fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  totalSalary: {
    fontSize: 18,
    fontWeight: '700',
    color: adminColors.salaryTotal,
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  emptyTab: { color: colors.textSecondary, marginBottom: spacing.sm },
  link: { color: adminColors.primary, fontWeight: '600' },
});
