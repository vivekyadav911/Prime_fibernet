import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { AdminHeaderButton, ADMIN_HEADER_ICON_SIZE } from '@/navigation/AdminHeaderButton';
import {
  DocumentLabelModal,
  DocumentRow,
  DocumentViewerModal,
  InfoRow,
  OfficerCredentialsCard,
  PermissionPills,
  RoleGuard,
  SectionHeader,
} from '@/components/admin';
import { EmploymentContractTab } from '@/components/admin/employment/EmploymentContractTab';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { officerStrings } from '@/constants/officerStrings';
import type { OfficerDocumentViewContent } from '@/hooks/useOfficerDocumentAccess';
import { useOfficerDocumentAccess } from '@/hooks/useOfficerDocumentAccess';
import {
  useDeleteOfficerDocumentMutation,
  useGetAdminOfficerDetailQuery,
  useGetOfficerDocumentsQuery,
  useGetOfficerProfileQuery,
  useGetOfficerRolePermissionsQuery,
  useRevealOfficerPasswordMutation,
  useResetOfficerPasswordMutation,
  useUploadAdditionalOfficerDocumentMutation,
  useUploadOfficerDocumentMutation,
} from '@/store/api/endpoints';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import type { OfficerDocument } from '@/types/api/officer';
import {
  OFFICER_DOCUMENT_DEFINITIONS,
  maskAccountNumber,
} from '@/types/api/officer';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { adminHeaderTheme } from '@/theme/adminHeader';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  pickOfficerDocument,
  pickOfficerImage,
  uploadAdditionalOfficerDocument,
  uploadOfficerDocumentForOfficer,
  OFFICER_DOCUMENTS_BUCKET,
  type OfficerDocumentType,
} from '@/utils/uploadOfficerDocument';
import { isPdfPath } from '@/utils/storagePdf';
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

function isStandardPlaceholderId(id: string): boolean {
  return OFFICER_DOCUMENT_DEFINITIONS.some((d) => d.type === id);
}

export function OfficerDetailScreen({ route, navigation }: Props) {
  const { officerId } = route.params;
  const [tab, setTab] = useState<DetailTab>('onboarding');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerContent, setViewerContent] = useState<OfficerDocumentViewContent | null>(null);
  const [loadingViewId, setLoadingViewId] = useState<string | null>(null);
  const [loadingDownloadId, setLoadingDownloadId] = useState<string | null>(null);
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [pendingAdditionalLabel, setPendingAdditionalLabel] = useState<string | null>(null);

  const { data: summary, isLoading, isError, error, refetch } = useGetAdminOfficerDetailQuery(officerId);
  const { data: profile } = useGetOfficerProfileQuery(officerId);
  const { data: documents } = useGetOfficerDocumentsQuery(officerId, { skip: tab !== 'documents' });
  const { data: permissions = [] } = useGetOfficerRolePermissionsQuery(profile?.roleId ?? '', {
    skip: !profile?.roleId,
  });

  const { prepareView, downloadDocument } = useOfficerDocumentAccess();
  const [revealPassword, { isLoading: revealing }] = useRevealOfficerPasswordMutation();
  const [resetPassword, { isLoading: resetting }] = useResetOfficerPasswordMutation();
  const [uploadDoc] = useUploadOfficerDocumentMutation();
  const [uploadAdditionalDoc] = useUploadAdditionalOfficerDocumentMutation();
  const [deleteDoc] = useDeleteOfficerDocumentMutation();

  const standardDocuments = useMemo(
    () => (documents ?? []).filter((d) => !d.isAdditional),
    [documents],
  );
  const additionalDocuments = useMemo(
    () => (documents ?? []).filter((d) => d.isAdditional),
    [documents],
  );

  const tabs = useMemo(
    () =>
      [
        { key: 'onboarding' as const, label: officerStrings.detail.tabs.onboarding },
        { key: 'contract' as const, label: officerStrings.detail.tabs.contract },
        { key: 'documents' as const, label: officerStrings.detail.tabs.documents },
      ] as const,
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: summary?.name ?? 'Officer',
      headerRight: () => (
        <AdminHeaderButton
          accessibilityLabel="Edit officer"
          onPress={() => navigation.navigate('OfficerEdit', { officerId })}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={ADMIN_HEADER_ICON_SIZE}
            color={adminHeaderTheme.foreground}
          />
        </AdminHeaderButton>
      ),
    });
  }, [navigation, officerId, summary?.name]);

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

  const handleViewDocument = useCallback(
    async (doc: OfficerDocument) => {
      if (!doc.storagePath) return;
      try {
        setLoadingViewId(doc.id);

        if (isPdfPath(doc.storagePath, doc.mimeType)) {
          navigation.navigate('ContractPdfViewer', {
            storagePath: doc.storagePath,
            title: doc.label,
            bucket: OFFICER_DOCUMENTS_BUCKET,
          });
          return;
        }

        const content = await prepareView(doc.storagePath, doc.mimeType);
        setViewerTitle(doc.label);
        setViewerContent(content);
        setViewerVisible(true);
      } catch (e) {
        Alert.alert('Could not open document', queryErrorMessage(e));
      } finally {
        setLoadingViewId(null);
      }
    },
    [navigation, prepareView],
  );

  const handleDownloadDocument = useCallback(
    async (doc: OfficerDocument) => {
      if (!doc.storagePath) return;
      try {
        setLoadingDownloadId(doc.id);
        await downloadDocument(doc.storagePath, doc.label, doc.mimeType);
      } catch (e) {
        Alert.alert('Download failed', queryErrorMessage(e));
      } finally {
        setLoadingDownloadId(null);
      }
    },
    [downloadDocument],
  );

  const handleReplaceDoc = useCallback(
    async (dbType: string, label: string) => {
      try {
        const isPhoto = dbType.includes('photo') || dbType === 'profile_photo';
        const picked = isPhoto ? await pickOfficerImage() : await pickOfficerDocument();
        if (!picked) return;
        const uploaded = await uploadOfficerDocumentForOfficer(
          officerId,
          dbType as OfficerDocumentType,
          picked,
        );
        await uploadDoc({
          officerId,
          documentType: dbType,
          storagePath: uploaded.storagePath,
          mimeType: picked.mimeType,
          displayName: label,
        }).unwrap();
        Alert.alert('Uploaded', `${label} updated.`);
      } catch (e) {
        Alert.alert('Upload failed', queryErrorMessage(e));
      }
    },
    [officerId, uploadDoc],
  );

  const handleDeleteDoc = useCallback(
    async (doc: OfficerDocument) => {
      if (isStandardPlaceholderId(doc.id)) return;
      try {
        await deleteDoc({
          officerId,
          documentId: doc.id,
          storagePath: doc.storagePath,
        }).unwrap();
      } catch (e) {
        Alert.alert('Error', queryErrorMessage(e));
      }
    },
    [deleteDoc, officerId],
  );

  const uploadAdditionalWithLabel = useCallback(
    async (label: string) => {
      try {
        const picked = await pickOfficerDocument();
        if (!picked) return;
        const uploaded = await uploadAdditionalOfficerDocument(officerId, picked);
        await uploadAdditionalDoc({
          officerId,
          storagePath: uploaded.storagePath,
          displayName: label,
          mimeType: picked.mimeType,
        }).unwrap();
        Alert.alert('Uploaded', `${label} added.`);
      } catch (e) {
        Alert.alert('Upload failed', queryErrorMessage(e));
      }
    },
    [officerId, uploadAdditionalDoc],
  );

  const promptAdditionalLabel = useCallback(() => {
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        'Document label',
        'Enter a name for this document',
        async (label) => {
          if (!label?.trim()) return;
          await uploadAdditionalWithLabel(label.trim());
        },
      );
      return;
    }
    setLabelModalVisible(true);
  }, [uploadAdditionalWithLabel]);

  const handleLabelModalSubmit = useCallback(
    async (label: string) => {
      setLabelModalVisible(false);
      setPendingAdditionalLabel(label);
      await uploadAdditionalWithLabel(label);
      setPendingAdditionalLabel(null);
    },
    [uploadAdditionalWithLabel],
  );

  const closeViewer = useCallback(() => {
    setViewerVisible(false);
    setViewerContent(null);
  }, []);

  const renderDocumentRow = (doc: OfficerDocument) => {
    const def = OFFICER_DOCUMENT_DEFINITIONS.find((d) => d.type === doc.type);
    const dbType = def?.dbType ?? doc.type.toLowerCase();
    const hasFile = doc.status === 'uploaded' && !!doc.storagePath;
    const canDelete = hasFile && doc.id && !isStandardPlaceholderId(doc.id)
      && (doc.isAdditional || !doc.required);

    return (
      <DocumentRow
        key={doc.id}
        document={doc}
        loadingView={loadingViewId === doc.id}
        loadingDownload={loadingDownloadId === doc.id}
        onView={hasFile ? () => void handleViewDocument(doc) : undefined}
        onDownload={hasFile ? () => void handleDownloadDocument(doc) : undefined}
        onReplace={!doc.isAdditional ? () => void handleReplaceDoc(dbType, doc.label) : undefined}
        onDelete={canDelete ? () => void handleDeleteDoc(doc) : undefined}
      />
    );
  };

  if (isLoading) return <Screen safeAreaTop={false} style={adminScreenStyles.canvas}><SkeletonLoader rows={8} showAvatar /></Screen>;
  if (isError || !summary) return <Screen safeAreaTop={false} style={adminScreenStyles.canvas}><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  const p = profile;

  return (
    <RoleGuard requiredPermission="officers.view">
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
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

          {tab === 'contract' ? <EmploymentContractTab officerId={officerId} profile={p ?? profile} /> : null}

          {tab === 'documents' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Required Documents</Text>
                {standardDocuments.map(renderDocumentRow)}
              </View>

              <View style={styles.card}>
                <View style={styles.additionalHeader}>
                  <Text style={styles.sectionTitle}>Additional Documents</Text>
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => promptAdditionalLabel()}
                    disabled={!!pendingAdditionalLabel}
                  >
                    <Text style={styles.addBtnText}>+ Add Document</Text>
                  </Pressable>
                </View>
                {additionalDocuments.length === 0 ? (
                  <Text style={styles.emptyAdditional}>No additional documents yet.</Text>
                ) : (
                  additionalDocuments.map(renderDocumentRow)
                )}
              </View>
            </>
          ) : null}
        </ScrollView>

        <DocumentViewerModal
          visible={viewerVisible}
          title={viewerTitle}
          content={viewerContent}
          onClose={closeViewer}
        />

        <DocumentLabelModal
          visible={labelModalVisible}
          onCancel={() => setLabelModalVisible(false)}
          onSubmit={(label) => void handleLabelModalSubmit(label)}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  additionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: adminColors.primary,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfaceWhite,
  },
  emptyAdditional: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ecBlock: { marginBottom: spacing.sm },
  ecTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xxs },
  emptyTab: { color: colors.textSecondary, marginBottom: spacing.sm },
});
