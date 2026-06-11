import { createElement } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type DocumentViewerModalProps = {
  visible: boolean;
  url: string | null;
  title?: string;
  mimeType?: string | null;
  onClose: () => void;
};

function isPdf(url: string, mimeType?: string | null): boolean {
  if (mimeType?.includes('pdf')) return true;
  return url.toLowerCase().includes('.pdf');
}

function WebDocumentFrame({ url, title }: { url: string; title?: string }) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.viewer}>
      {createElement('iframe', {
        src: url,
        title: title ?? 'Document',
        style: { width: '100%', height: '100%', border: 'none' },
      })}
    </View>
  );
}

export function DocumentViewerModal({ visible, url, title, mimeType, onClose }: DocumentViewerModalProps) {
  const pdf = url ? isPdf(url, mimeType) : false;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{title ?? 'Document'}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        {url ? (
          pdf ? (
            Platform.OS === 'web' ? (
              <WebDocumentFrame url={url} title={title} />
            ) : (
              <WebView source={{ uri: url }} style={styles.viewer} />
            )
          ) : (
            <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
          )
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No document to display</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.textPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  close: { fontSize: 16, color: colors.primaryNavy, fontWeight: '600' },
  viewer: { flex: 1 },
  image: { flex: 1, backgroundColor: '#000' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary },
});
