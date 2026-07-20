import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme/colors';
import {
  buildGenericLeafletHtml,
  type LeafletCircle,
  type LeafletMapState,
  type LeafletPin,
  type LeafletPolyline,
} from '@/utils/leafletWebViewHtml';

export type { LeafletCircle, LeafletPin, LeafletPolyline };

export type LeafletMapViewProps = {
  style?: StyleProp<ViewStyle>;
  /** When set, the map recenters here on every change (follow mode / pickers). */
  center?: { latitude: number; longitude: number } | null;
  zoom?: number;
  pins?: LeafletPin[];
  circles?: LeafletCircle[];
  polylines?: LeafletPolyline[];
  /** Auto-frame all pins/circles once on load (ignored when center is set). */
  fitToContent?: boolean;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  onPinDragEnd?: (coordinate: { latitude: number; longitude: number }, pinId: string) => void;
};

/**
 * Free native map — Leaflet + OSM tiles inside a WebView.
 * Replaces react-native-maps on Android, which refuses to render without a
 * Google Maps API key even when only free UrlTile layers are used.
 * Data updates are pushed via injectJavaScript, so the WebView never reloads.
 */
export function LeafletMapView({
  style,
  center = null,
  zoom,
  pins = [],
  circles = [],
  polylines = [],
  fitToContent = false,
  onMapPress,
  onPinDragEnd,
}: LeafletMapViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const state = useMemo<LeafletMapState>(
    () => ({
      center,
      zoom: zoom ?? null,
      pins,
      circles,
      polylines,
      fit: fitToContent,
    }),
    [center, circles, fitToContent, pins, polylines, zoom],
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  // HTML is built once from the first state; later changes go through __update.
  const html = useRef(buildGenericLeafletHtml(stateRef.current)).current;

  useEffect(() => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(`window.__update(${JSON.stringify(state)}); true;`);
  }, [state]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              id?: string;
              latitude?: number;
              longitude?: number;
              zoom?: number;
            };
            if (msg.type === 'map-ready') {
              readyRef.current = true;
              webRef.current?.injectJavaScript(
                `window.__update(${JSON.stringify(stateRef.current)}); true;`,
              );
            } else if (msg.type === 'map-press' && onMapPress) {
              if (typeof msg.latitude === 'number' && typeof msg.longitude === 'number') {
                onMapPress({ latitude: msg.latitude, longitude: msg.longitude });
              }
            } else if (msg.type === 'pin-drag' && onPinDragEnd) {
              if (typeof msg.latitude === 'number' && typeof msg.longitude === 'number') {
                onPinDragEnd(
                  { latitude: msg.latitude, longitude: msg.longitude },
                  msg.id ?? '',
                );
              }
            }
          } catch {
            /* non-JSON message — ignore */
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
