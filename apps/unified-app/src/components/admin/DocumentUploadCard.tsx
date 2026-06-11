import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type DocumentUploadCardProps = {
  label: string;
  fileName?: string | null;
  uploading?: boolean;
  error?: string;
  onUpload: () => void;
};

export function DocumentUploadCard({
  label,
  fileName,
  uploading,
  error,
  onUpload,
}: DocumentUploadCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {fileName ? <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text> : null}
      <Pressable
        style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
        onPress={onUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={adminColors.primary} />
        ) : (
          <>
            <Text style={styles.uploadIcon}>↑</Text>
            <Text style={styles.uploadText}>Upload</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  fileName: { fontSize: 12, color: adminColors.badgeActive, marginBottom: spacing.sm },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadIcon: { fontSize: 16, color: adminColors.primary },
  uploadText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
  error: { fontSize: 12, color: adminColors.badgeBlocked, marginTop: spacing.xxs },
});
