import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ErrorState, PdfWebView, ViewerScreenHeader } from '@/components/common';
import { useContractPDF } from '@/hooks/useContractPDF';
import { useLazyGetOfficerDocumentSignedUrlQuery } from '@/services/api/adminOfficersApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { OFFICER_DOCUMENTS_BUCKET } from '@/utils/uploadOfficerDocument';
import { prepareStoragePdfView, shareLocalPdf } from '@/utils/storagePdf';
import { queryErrorMessage } from '@/utils/queryError';

type ContractPdfViewerParams = {
  storagePath: string;
  title?: string;
  /** Storage bucket — defaults to employment contracts. */
  bucket?: string;
};

type Props = NativeStackScreenProps<{ ContractPdfViewer: ContractPdfViewerParams }, 'ContractPdfViewer'>;

const EMPLOYMENT_CONTRACTS_BUCKET = 'employment-contracts';

function isEmptyDocumentError(message: string): boolean {
  return message.includes('empty on the server') || message.includes('empty or could not be read');
}

export function ContractPdfViewerScreen({ route, navigation }: Props) {
  const { storagePath, title = 'Document', bucket = EMPLOYMENT_CONTRACTS_BUCKET } = route.params;
  const { prepareLocalPdfView, shareContract } = useContractPDF();
  const [fetchOfficerSignedUrl] = useLazyGetOfficerDocumentSignedUrlQuery();
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

      if (bucket === EMPLOYMENT_CONTRACTS_BUCKET) {
        const prepared = await prepareLocalPdfView(storagePath);
        setLocalUri(prepared.localUri);
        setSignedUrl(prepared.signedUrl);
        setViewMode(prepared.viewMode);
        setViewerHtml(prepared.viewerHtml ?? null);
        return;
      }

      const prepared = await prepareStoragePdfView({
        bucket,
        storagePath,
        cacheFileName: `doc_view_${Date.now()}.pdf`,
        resolveSignedUrl: (path) =>
          fetchOfficerSignedUrl({ storagePath: path, expirySeconds: 3600 }).unwrap(),
      });
      setLocalUri(prepared.localUri);
      setSignedUrl(prepared.signedUrl);
      setViewMode(prepared.viewMode);
      setViewerHtml(prepared.viewerHtml ?? null);
    } catch (e) {
      setError(queryErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [bucket, fetchOfficerSignedUrl, prepareLocalPdfView, storagePath]);

  useEffect(() => {
    void loadPdf();
  }, [loadPdf]);

  const handleShare = useCallback(async () => {
    if (!localUri) return;
    if (bucket === EMPLOYMENT_CONTRACTS_BUCKET) {
      await shareContract(localUri, title, signedUrl ?? undefined);
      return;
    }
    await shareLocalPdf({
      localUri,
      title,
      fileName: `${title.replace(/[^\w.-]+/g, '_')}.pdf`,
      webDownloadUrl: signedUrl?.startsWith('http') ? signedUrl : undefined,
    });
  }, [bucket, localUri, shareContract, signedUrl, title]);

  const needsReupload = error ? isEmptyDocumentError(error) : false;

  return (
    <Screen padded={false} style={styles.screen}>
      <ViewerScreenHeader
        title={title}
        onBack={() => navigation.goBack()}
        rightAction={
          localUri
            ? { label: 'Share', onPress: () => void handleShare() }
            : undefined
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={adminColors.primary} />
          <Text style={styles.loadingText}>Loading PDF…</Text>
        </View>
      ) : null}

      {error ? (
        <ErrorState
          message={
            needsReupload && bucket === EMPLOYMENT_CONTRACTS_BUCKET
              ? 'This contract PDF is empty on the server. Go back to the Contract tab and tap Regenerate PDF to create a new copy.'
              : needsReupload
                ? 'This file is empty on the server. Go back and tap Replace on the Documents tab to upload it again.'
                : error
          }
          onRetry={needsReupload ? undefined : () => void loadPdf()}
          onBack={() => navigation.goBack()}
        />
      ) : null}

      {!loading && !error && localUri ? (
        <PdfWebView
          viewMode={viewMode}
          localUri={localUri}
          viewerHtml={viewerHtml ?? undefined}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.textSecondary },
});

export type { ContractPdfViewerParams };

export { OFFICER_DOCUMENTS_BUCKET, EMPLOYMENT_CONTRACTS_BUCKET };
