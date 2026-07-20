import '@/shims/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

// Type-only import: erased at compile time, so Metro never self-resolves the .web file.
import type { LeafletMapViewProps } from './LeafletMapView';
import type { LeafletPin } from '@/utils/leafletWebViewHtml';

export type { LeafletMapViewProps };
export type { LeafletCircle, LeafletPin, LeafletPolyline } from '@/utils/leafletWebViewHtml';

function pinIcon(pin: LeafletPin): L.DivIcon {
  if (pin.kind === 'avatar') {
    return L.divIcon({
      className: '',
      html: `<div style="width:36px;height:36px;border-radius:50%;background:${pin.color ?? '#4F46E5'};color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.28)">${pin.label ?? ''}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }
  if (pin.kind === 'pill') {
    return L.divIcon({
      className: '',
      html: `<div style="padding:2px 6px;border-radius:8px;background:${pin.color ?? '#4F46E5'};color:#fff;font-weight:700;font-size:11px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);width:max-content">${pin.label ?? ''}</div>`,
      iconAnchor: [16, 10],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${pin.color ?? '#E11D48'};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapController({
  center,
  zoom,
  fitPoints,
  fit,
  onMapPress,
}: {
  center?: { latitude: number; longitude: number } | null;
  zoom?: number;
  fitPoints: Array<[number, number]>;
  fit: boolean;
  onMapPress?: LeafletMapViewProps['onMapPress'];
}) {
  const map = useMap();
  const didFrame = useRef(false);

  useMapEvents({
    click(event) {
      onMapPress?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  useEffect(() => {
    if (center) {
      map.setView([center.latitude, center.longitude], zoom ?? map.getZoom(), {
        animate: true,
      });
      return;
    }
    if (fit && !didFrame.current && fitPoints.length > 0) {
      if (fitPoints.length === 1) {
        map.setView(fitPoints[0]!, zoom ?? 14);
      } else {
        map.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 48], maxZoom: 15 });
      }
      didFrame.current = true;
    }
  }, [center, fit, fitPoints, map, zoom]);

  return null;
}

/** Web build of the free Leaflet map — same props as the native WebView version. */
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
  const first = center ?? pins[0] ?? circles[0];
  const fitPoints: Array<[number, number]> = [
    ...circles.map((c) => [c.latitude, c.longitude] as [number, number]),
    ...pins.map((p) => [p.latitude, p.longitude] as [number, number]),
  ];

  return (
    <View style={[styles.wrap, style]}>
      <MapContainer
        center={[first?.latitude ?? 20.5937, first?.longitude ?? 78.9629]}
        zoom={zoom ?? 12}
        style={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          center={center}
          zoom={zoom}
          fitPoints={fitPoints}
          fit={fitToContent}
          onMapPress={onMapPress}
        />
        {circles.map((c) => (
          <Circle
            key={c.id}
            center={[c.latitude, c.longitude]}
            radius={c.radius}
            pathOptions={{
              color: c.color ?? '#4F46E5',
              fillColor: c.fillColor ?? c.color ?? '#4F46E5',
              fillOpacity: c.fillOpacity ?? 0.15,
              weight: c.weight ?? 2,
            }}
          />
        ))}
        {polylines.map((pl) =>
          pl.points.length > 1 ? (
            <Polyline
              key={pl.id}
              positions={pl.points.map((p) => [p.latitude, p.longitude] as [number, number])}
              pathOptions={{
                color: pl.color ?? '#4F46E5',
                weight: 3,
                dashArray: pl.dashed ? '5,5' : undefined,
              }}
            />
          ) : null,
        )}
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={pinIcon(pin)}
            draggable={pin.draggable}
            eventHandlers={
              pin.draggable
                ? {
                    dragend: (event) => {
                      const latLng = (event.target as L.Marker).getLatLng();
                      onPinDragEnd?.(
                        { latitude: latLng.lat, longitude: latLng.lng },
                        pin.id,
                      );
                    },
                  }
                : undefined
            }
          >
            {pin.title ? (
              <Popup>
                <strong>{pin.title}</strong>
                {pin.subtitle ? (
                  <>
                    <br />
                    {pin.subtitle}
                  </>
                ) : null}
              </Popup>
            ) : null}
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  map: {
    height: '100%',
    width: '100%',
  },
});
