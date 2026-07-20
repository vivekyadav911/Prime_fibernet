import '@/shims/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import type { MapRequestPin } from '@/types/api/admin';
import type { OfficerLocation } from '@/types/map';

const DEFAULT_CENTER = { latitude: -37.8136, longitude: 144.9631 };
const DEFAULT_ZOOM = 11;
const FIT_BOUNDS_PADDING: L.PointExpression = [48, 56];

type Props = {
  officers: OfficerLocation[];
  requests: MapRequestPin[];
  showOfficers: boolean;
  showRequests: boolean;
};

function officerIcon(officer: OfficerLocation, index: number): L.DivIcon {
  const name = officer.officer?.name ?? 'Officer';
  const color = officer.is_online
    ? (officer.officer?.avatar_color ?? getOfficerColor(name, index))
    : colors.textSecondary;
  const initials = officer.officer?.initials ?? getOfficerInitials(name);
  return L.divIcon({
    className: 'admin-tracking-officer-pin',
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: ${color}; color: #fff; font-weight: 700; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.28);
    ">${initials}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function requestIcon(): L.DivIcon {
  return L.divIcon({
    className: 'admin-tracking-request-pin',
    html: `<div style="
      width: 18px; height: 18px; border-radius: 4px;
      background: ${colors.warningAmber}; border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitPins({
  officers,
  requests,
  showOfficers,
  showRequests,
}: Props) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ animate: false });
    const points: [number, number][] = [];
    if (showOfficers) {
      for (const o of officers) {
        if (Number.isFinite(o.latitude) && Number.isFinite(o.longitude)) {
          points.push([o.latitude, o.longitude]);
        }
      }
    }
    if (showRequests) {
      for (const r of requests) {
        if (Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
          points.push([r.lat, r.lng]);
        }
      }
    }

    if (points.length === 0) {
      map.setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0]!, 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: FIT_BOUNDS_PADDING, maxZoom: 14 });
  }, [map, officers, requests, showOfficers, showRequests]);

  return null;
}

/** Web officer-tracking map (Leaflet) — replaces the list-only stub. */
export function AdminTrackingMap({
  officers,
  requests,
  showOfficers,
  showRequests,
}: Props) {
  const initial = useMemo(() => {
    const first = officers[0];
    if (first && Number.isFinite(first.latitude) && Number.isFinite(first.longitude)) {
      return { latitude: first.latitude, longitude: first.longitude };
    }
    const req = requests[0];
    if (req && Number.isFinite(req.lat) && Number.isFinite(req.lng)) {
      return { latitude: req.lat, longitude: req.lng };
    }
    return DEFAULT_CENTER;
  }, [officers, requests]);

  return (
    <View style={styles.wrap}>
      <MapContainer
        center={[initial.latitude, initial.longitude]}
        zoom={DEFAULT_ZOOM}
        style={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitPins
          officers={officers}
          requests={requests}
          showOfficers={showOfficers}
          showRequests={showRequests}
        />
        {showOfficers
          ? officers.map((o, index) => (
              <Marker
                key={o.officer_id}
                position={[o.latitude, o.longitude]}
                icon={officerIcon(o, index)}
              >
                <Popup>
                  <div style={{ minWidth: 140, fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {o.officer?.name ?? 'Officer'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      {o.is_online ? 'Online' : 'Offline'} · {o.latitude.toFixed(4)},{' '}
                      {o.longitude.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}
        {showRequests
          ? requests.map((r) => (
              <Marker key={r.requestId} position={[r.lat, r.lng]} icon={requestIcon()}>
                <Popup>
                  <div style={{ minWidth: 140, fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.type}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{r.status}</div>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}
      </MapContainer>
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
    height: '100%',
    width: '100%',
  },
});
