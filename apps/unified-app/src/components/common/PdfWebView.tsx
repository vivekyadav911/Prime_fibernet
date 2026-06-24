import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { createElement } from 'react';

import { PDF_WEBVIEW_PROPS } from '@/utils/storagePdf';
import type { PdfViewMode } from '@/utils/storagePdf';
import { colors } from '@/theme/colors';
import { adminColors } from '@/theme/admin';

type PdfWebViewProps = {
  viewMode: PdfViewMode;
  localUri: string;
  viewerHtml?: string;
};

export function PdfWebView({ viewMode, localUri, viewerHtml }: PdfWebViewProps) {
  if (viewMode === 'file') {
    return (
      <WebView
        {...PDF_WEBVIEW_PROPS}
        source={{ uri: localUri }}
        style={styles.viewer}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={adminColors.primary} />
          </View>
        )}
      />
    );
  }

  if (!viewerHtml) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={adminColors.primary} />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.viewer}>
        {createElement('iframe', {
          srcDoc: viewerHtml,
          title: 'PDF',
          style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#525659' },
        })}
      </View>
    );
  }

  return (
    <WebView
      {...PDF_WEBVIEW_PROPS}
      source={{ html: viewerHtml }}
      style={styles.viewer}
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={adminColors.primary} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#525659' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
