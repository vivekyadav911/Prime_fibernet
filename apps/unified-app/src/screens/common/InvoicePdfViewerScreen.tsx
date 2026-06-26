import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ErrorState, PdfWebView, ViewerScreenHeader } from '@/components/common';
import { useInvoicePDF } from '@/hooks/useInvoicePDF';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { shareLocalPdf } from '@/utils/storagePdf';
import { queryErrorMessage } from '@/utils/queryError';
import type { AdminInvoicesStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'InvoicePdfViewer'>;

export function InvoicePdfViewerScreen({ route, navigation }: Props) {
  const { storagePath, title = 'Invoice', fileName = 'Invoice.pdf' } = route.params;
  const { prepareLocalPdfView, shareFromStoragePath } = useInvoicePDF();
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'file' | 'html'>('file');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPdf = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const prepared = await prepareLocalPdfView(storagePath);
      setLocalUri(prepared.localUri);
      setSignedUrl(prepared.signedUrl);
      setViewMode(prepared.viewMode);
      setViewerHtml(prepared.viewerHtml ?? null);
    } catch (e) {
      setError(queryErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [prepareLocalPdfView, storagePath]);

  useEffect(() => {
    void loadPdf();
  }, [loadPdf]);

  const handleShare = useCallback(async () => {
    await shareFromStoragePath(storagePath, title, fileName);
  }, [fileName, shareFromStoragePath, storagePath, title]);

  const handleDownload = useCallback(async () => {
    if (!localUri) return;
    await shareLocalPdf({
      localUri,
      title,
      fileName,
      webDownloadUrl: signedUrl?.startsWith('http') ? signedUrl : undefined,
    });
  }, [fileName, localUri, signedUrl, title]);

  return (
    <Screen padded={false} style={styles.screen}>
      <ViewerScreenHeader
        title={title}
        onBack={() => navigation.goBack()}
        rightAction={localUri ? { label: 'Share', onPress: () => void handleShare() } : undefined}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={adminColors.primary} />
          <Text style={styles.loadingText}>Loading invoice PDF…</Text>
        </View>
      ) : null}

      {error ? (
        <ErrorState message={error} onRetry={() => void loadPdf()} onBack={() => navigation.goBack()} />
      ) : null}

      {!loading && !error && !localUri ? (
        <ErrorState
          message="Could not prepare PDF for viewing."
          onRetry={() => void loadPdf()}
          onBack={() => navigation.goBack()}
        />
      ) : null}

      {!loading && !error && localUri ? (
        <>
          <PdfWebView viewMode={viewMode} localUri={localUri} viewerHtml={viewerHtml ?? undefined} />
          <View style={styles.footer}>
            <Pressable
              onPress={() => void handleDownload()}
              style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Download PDF"
              hitSlop={12}
            >
              <Text style={styles.downloadHint}>Download PDF</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.textSecondary },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
  },
  downloadBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  downloadBtnPressed: { opacity: 0.6 },
  downloadHint: {
    color: adminColors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
});
