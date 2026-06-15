import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ui } from '../officersUi';

type AddOfficerUploadCardProps = {
  label: string;
  fileName?: string | null;
  uploading?: boolean;
  error?: string;
  onUpload: () => void;
};

export function AddOfficerUploadCard({
  label,
  fileName,
  uploading,
  error,
  onUpload,
}: AddOfficerUploadCardProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          fileName ? styles.cardFilled : null,
          pressed && !uploading && styles.cardPressed,
          uploading && styles.cardDisabled,
        ]}
        onPress={onUpload}
        disabled={uploading}
        accessibilityRole="button"
      >
        <View style={styles.iconWrap}>
          {uploading ? (
            <ActivityIndicator size="small" color={ui.brand} />
          ) : (
            <Ionicons name={fileName ? 'document-text-outline' : 'cloud-upload-outline'} size={20} color={ui.brand} />
          )}
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.actionText}>{fileName ? 'Replace file' : 'Tap to upload'}</Text>
          {fileName ? (
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName}
            </Text>
          ) : (
            <Text style={styles.hint}>PDF, JPG, or PNG</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={ui.textSecondary} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  card: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: ui.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    backgroundColor: ui.searchFill,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardFilled: {
    backgroundColor: '#F7F6FE',
    borderColor: '#D8D2F8',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 79, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: ui.text,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: ui.brand,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.danger,
    marginTop: 6,
  },
});
