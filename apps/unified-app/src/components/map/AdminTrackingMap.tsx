import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import type { MapRequestPin } from '@/types/api/admin';
import type { OfficerLocation } from '@/types/map';
import { buildAdminTrackingLeafletHtml } from '@/utils/leafletWebViewHtml';

type Props = {
  officers: OfficerLocation[];
  requests: MapRequestPin[];
  showOfficers: boolean;
  showRequests: boolean;
};

/**
 * Native officer-tracking map via Leaflet WebView.
 * Android react-native-maps needs a Google Maps API key even for OSM UrlTile;
 * this path matches web and works in the current Expo dev client without a rebuild.
 */
export function AdminTrackingMap({
  officers,
  requests,
  showOfficers,
  showRequests,
}: Props) {
  const html = useMemo(
    () =>
      buildAdminTrackingLeafletHtml({
        officers,
        requests,
        showOfficers,
        showRequests,
      }),
    [officers, requests, showOfficers, showRequests],
  );

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  map: {
    flex: 1,
    backgroundColor: adminColors.cardBg,
  },
});
