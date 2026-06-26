import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { OfficerDocument } from '@/types/api/officer';
import { officerStrings } from '@/constants/officerStrings';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type DocumentRowProps = {
  document: OfficerDocument;
  onView?: () => void;
  onDownload?: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
  loadingView?: boolean;
  loadingDownload?: boolean;
};

export function DocumentRow({
  document,
  onView,
  onDownload,
  onReplace,
  onDelete,
  loadingView,
  loadingDownload,
}: DocumentRowProps) {
  const uploaded = document.status === 'uploaded';

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.label}>
          {document.label}
          {document.required ? '*' : ''}
        </Text>
        <Text style={[styles.status, uploaded ? styles.uploaded : styles.missing]}>
          {uploaded
            ? officerStrings.detail.documentStatus.uploaded
            : officerStrings.detail.documentStatus.notUploaded}
        </Text>
      </View>
      <View style={styles.actions}>
        {uploaded && onView ? (
          <Pressable onPress={onView} style={styles.actionBtn} disabled={loadingView}>
            <Text style={styles.viewIcon}>{loadingView ? '…' : '👁'}</Text>
          </Pressable>
        ) : null}
        {uploaded && onDownload ? (
          <Pressable onPress={onDownload} style={styles.actionBtn} disabled={loadingDownload}>
            <Text style={styles.downloadIcon}>{loadingDownload ? '…' : '↓'}</Text>
          </Pressable>
        ) : null}
        {onReplace ? (
          <Pressable onPress={onReplace} style={styles.actionBtn}>
            <Text style={styles.replaceIcon}>✎</Text>
          </Pressable>
        ) : null}
        {uploaded && onDelete ? (
          <Pressable onPress={onDelete} style={styles.actionBtn}>
            <Text style={styles.deleteIcon}>🗑</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export async function openDocumentUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  status: { fontSize: 12, marginTop: 2 },
  uploaded: { color: adminColors.badgeActive },
  missing: { color: adminColors.badgeBlocked },
  actions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { padding: spacing.xxs },
  viewIcon: { fontSize: 16, color: adminColors.sectionIconBlue },
  downloadIcon: { fontSize: 16, color: adminColors.primary, fontWeight: '700' },
  replaceIcon: { fontSize: 16, color: adminColors.badgeWarning },
  deleteIcon: { fontSize: 16, color: adminColors.deleteIcon },
});
