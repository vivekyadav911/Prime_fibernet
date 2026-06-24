/**
 * Web stub for react-native-maps — native MapKit/Google Maps are unavailable on web.
 * Metro resolves `react-native-maps` to this file when platform === 'web'.
 */
import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewProps = ViewProps & {
  region?: Region;
  initialRegion?: Region;
  mapType?: string;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
};

const MapView = forwardRef<View, MapViewProps>(function MapView({ style, children }, ref) {
  return (
    <View ref={ref} style={style}>
      {children}
    </View>
  );
});

export function Marker(_props: Record<string, unknown>) {
  return null;
}

export function Circle(_props: Record<string, unknown>) {
  return null;
}

export function Polygon(_props: Record<string, unknown>) {
  return null;
}

export function Polyline(_props: Record<string, unknown>) {
  return null;
}

export function UrlTile(_props: Record<string, unknown>) {
  return null;
}

export default MapView;
