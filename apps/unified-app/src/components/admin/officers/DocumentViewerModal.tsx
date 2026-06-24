import { Image, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { createElement } from 'react';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { PdfWebView, ViewerScreenHeader } from '@/components/common';
import type { OfficerDocumentViewContent } from '@/hooks/useOfficerDocumentAccess';

type DocumentViewerModalProps = {
  visible: boolean;
  title?: string;
  content?: OfficerDocumentViewContent | null;
  onClose: () => void;
};

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

export function DocumentViewerModal({
  visible,
  title,
  content,
  onClose,
}: DocumentViewerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ViewerScreenHeader title={title ?? 'Document'} onBack={onClose} />

        <View style={styles.body}>
          {content ? (
            content.kind === 'pdf' ? (
              <PdfWebView
                viewMode={content.viewMode}
                localUri={content.localUri}
                viewerHtml={content.viewerHtml}
              />
            ) : content.kind === 'image' ? (
              <Image source={{ uri: content.resolvedUrl }} style={styles.image} resizeMode="contain" />
            ) : Platform.OS === 'web' ? (
              <WebDocumentFrame url={content.resolvedUrl} title={title} />
            ) : (
              <WebView source={{ uri: content.resolvedUrl }} style={styles.viewer} originWhitelist={['*']} />
            )
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No document to display</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  viewer: { flex: 1 },
  image: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
});
