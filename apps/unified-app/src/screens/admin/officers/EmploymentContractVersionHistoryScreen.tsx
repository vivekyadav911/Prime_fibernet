import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';


import { AdminScreenLayout, RoleGuard, useAdminPermission } from '@/components/admin';
import { EmptyState, SkeletonLoader } from '@/components/common';
import { useContractVersionHistory } from '@/hooks/useEmploymentContract';
import type { ContractVersion } from '@/types/contract';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'EmploymentContractVersionHistory'>;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN');
}

export function EmploymentContractVersionHistoryScreen({ route }: Props) {
  const { contractId, officerId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<AdminOfficersStackParamList>>();
  const canEdit = useAdminPermission('officers.edit');
  const { versions, isLoading, downloadVersion, deleteVersion, deletingVersion } =
    useContractVersionHistory(contractId, officerId);

  const handleView = useCallback(
    (version: ContractVersion) => {
      if (!version.pdfUrl) {
        Alert.alert('No PDF', 'PDF not available for this version.');
        return;
      }
      navigation.navigate('ContractPdfViewer', {
        storagePath: version.pdfUrl,
        title: `Contract v${version.versionNumber}`,
        contractSnapshot: version.snapshot,
      });
    },
    [navigation],
  );

  const handleDownload = useCallback(
    (version: ContractVersion) => {
      void downloadVersion(version).catch((e) => {
        Alert.alert('Download failed', queryErrorMessage(e));
      });
    },
    [downloadVersion],
  );

  const handleDelete = useCallback(
    (version: ContractVersion) => {
      Alert.alert(
        'Delete version?',
        `Remove version ${version.versionNumber} from history? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void deleteVersion(version).catch((e) => {
                Alert.alert('Delete failed', queryErrorMessage(e));
              });
            },
          },
        ],
      );
    },
    [deleteVersion],
  );

  const renderItem = useCallback(
    ({ item }: { item: ContractVersion }) => (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.version}>Version {item.versionNumber}</Text>
          <Text style={styles.date}>{formatWhen(item.createdAt)}</Text>
        </View>
        <Text style={styles.meta}>
          {item.snapshot.employeeFullName} · CTC {item.snapshot.ctcAnnual.toLocaleString('en-IN')}
        </Text>
        {item.pdfUrl ? (
          <View style={styles.actions}>
            <Pressable onPress={() => handleView(item)} style={styles.actionBtn}>
              <Text style={styles.actionText}>View PDF</Text>
            </Pressable>
            <Pressable onPress={() => handleDownload(item)} style={styles.actionBtn}>
              <Text style={styles.actionText}>Share PDF</Text>
            </Pressable>
            {canEdit ? (
              <Pressable
                onPress={() => handleDelete(item)}
                disabled={deletingVersion}
                style={styles.actionBtn}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.actions}>
            <Text style={styles.noPdf}>No PDF archived for this version</Text>
            {canEdit ? (
              <Pressable
                onPress={() => handleDelete(item)}
                disabled={deletingVersion}
                style={styles.actionBtn}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    ),
    [canEdit, deletingVersion, handleDelete, handleDownload, handleView],
  );

  return (
    <RoleGuard requiredPermission="officers.view">
      <AdminScreenLayout>
        {isLoading ? (
          <SkeletonLoader rows={5} />
        ) : versions.length === 0 ? (
          <EmptyState title="No version history" subtitle="Previous versions appear here after you regenerate a contract PDF." />
        ) : (
          <FlatList
            data={versions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xxs },
  version: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textSecondary },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { alignSelf: 'flex-start' },
  actionText: { color: adminColors.primary, fontWeight: '600' },
  deleteText: { color: colors.errorRed, fontWeight: '600' },
  noPdf: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', flex: 1 },
});
