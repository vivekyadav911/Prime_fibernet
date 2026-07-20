import type { MapRequestPin } from '@/types/api/admin';
import type { OfficerLocation } from '@/types/map';
import type { Geofence, OfficerLiveLocation } from '@/types/attendance';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export type LeafletPin = {
  id: string;
  latitude: number;
  longitude: number;
  /** 'avatar' = 36px round initials pin, 'dot' = small dot, 'pill' = small text pill. */
  kind?: 'avatar' | 'dot' | 'pill';
  label?: string;
  color?: string;
  title?: string;
  subtitle?: string;
  draggable?: boolean;
};

export type LeafletCircle = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
};

export type LeafletPolyline = {
  id: string;
  points: Array<{ latitude: number; longitude: number }>;
  color?: string;
  dashed?: boolean;
};

export type LeafletMapState = {
  center?: { latitude: number; longitude: number } | null;
  zoom?: number | null;
  pins?: LeafletPin[];
  circles?: LeafletCircle[];
  polylines?: LeafletPolyline[];
  /** Auto-frame all pins/circles once (ignored when center is set). */
  fit?: boolean;
};

function shell(bodyScript: string, heightCss = '100%'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="${LEAFLET_CSS}" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: ${heightCss}; background: #e5e7eb; }
    .officer-pin {
      width: 36px; height: 36px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.28);
    }
    .request-pin {
      width: 18px; height: 18px; border-radius: 4px; background: #F59E0B;
      border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .dot-pin {
      width: 20px; height: 20px; border-radius: 50%;
      border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
    .pill-pin {
      padding: 2px 6px; border-radius: 8px; color: #fff; font-weight: 700; font-size: 11px;
      white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.3); width: max-content;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="${LEAFLET_JS}"></script>
  <script>
    ${bodyScript}
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map-ready', zoom: map.getZoom() }));
    }
  </script>
</body>
</html>`;
}

/**
 * Generic Leaflet HTML with a `window.__update(state)` hook so React can push
 * new pins/circles/polylines via injectJavaScript without reloading the WebView.
 */
export function buildGenericLeafletHtml(initial: LeafletMapState): string {
  const first = initial.center ?? initial.pins?.[0] ?? initial.circles?.[0];
  const centerLat = first?.latitude ?? 20.5937;
  const centerLng = first?.longitude ?? 78.9629;
  const zoom = initial.zoom ?? 12;

  const script = `
    const map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], ${zoom});
    L.tileLayer('${OSM_TILES}', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    let didAutoFrame = false;
    function post(obj) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
    window.__update = function (s) {
      layer.clearLayers();
      const pts = [];
      (s.circles || []).forEach(function (c) {
        pts.push([c.latitude, c.longitude]);
        L.circle([c.latitude, c.longitude], {
          radius: c.radius,
          color: c.color || '#4F46E5',
          fillColor: c.fillColor || c.color || '#4F46E5',
          fillOpacity: c.fillOpacity == null ? 0.15 : c.fillOpacity,
          weight: c.weight == null ? 2 : c.weight,
        }).addTo(layer);
      });
      (s.polylines || []).forEach(function (pl) {
        if (!pl.points || pl.points.length < 2) return;
        L.polyline(pl.points.map(function (p) { return [p.latitude, p.longitude]; }), {
          color: pl.color || '#4F46E5',
          weight: 3,
          dashArray: pl.dashed ? '5,5' : null,
        }).addTo(layer);
      });
      (s.pins || []).forEach(function (p) {
        pts.push([p.latitude, p.longitude]);
        let html, size, anchor;
        if (p.kind === 'avatar') {
          html = '<div class="officer-pin" style="background:' + (p.color || '#4F46E5') + '">' + (p.label || '') + '</div>';
          size = [36, 36]; anchor = [18, 18];
        } else if (p.kind === 'pill') {
          html = '<div class="pill-pin" style="background:' + (p.color || '#4F46E5') + '">' + (p.label || '') + '</div>';
          size = null; anchor = [16, 10];
        } else {
          html = '<div class="dot-pin" style="background:' + (p.color || '#E11D48') + '"></div>';
          size = [20, 20]; anchor = [10, 10];
        }
        const icon = L.divIcon({ className: '', html: html, iconSize: size, iconAnchor: anchor });
        const m = L.marker([p.latitude, p.longitude], { icon: icon, draggable: !!p.draggable }).addTo(layer);
        if (p.title) {
          m.bindPopup('<strong>' + p.title + '</strong>' + (p.subtitle ? '<br/>' + p.subtitle : ''));
        }
        if (p.draggable) {
          m.on('dragend', function (e) {
            const ll = e.target.getLatLng();
            post({ type: 'pin-drag', id: p.id, latitude: ll.lat, longitude: ll.lng });
          });
        }
      });
      if (s.center) {
        map.setView([s.center.latitude, s.center.longitude], s.zoom || map.getZoom());
      } else if (s.fit && !didAutoFrame && pts.length > 0) {
        if (pts.length === 1) map.setView(pts[0], s.zoom || 14);
        else map.fitBounds(pts, { padding: [40, 48], maxZoom: 15 });
        didAutoFrame = true;
      }
    };
    map.on('click', function (e) {
      post({ type: 'map-press', latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
    window.__update(${JSON.stringify(initial)});
  `;

  return shell(script);
}

/** Leaflet HTML for admin officer-tracking pins (Android WebView — no Google Maps SDK). */
export function buildAdminTrackingLeafletHtml(input: {
  officers: OfficerLocation[];
  requests: MapRequestPin[];
  showOfficers: boolean;
  showRequests: boolean;
}): string {
  const officers = input.showOfficers
    ? input.officers.filter((o) => Number.isFinite(o.latitude) && Number.isFinite(o.longitude))
    : [];
  const requests = input.showRequests
    ? input.requests.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
    : [];

  const points: Array<[number, number]> = [
    ...officers.map((o) => [o.latitude, o.longitude] as [number, number]),
    ...requests.map((r) => [r.lat, r.lng] as [number, number]),
  ];

  const center = points[0] ?? [-37.8136, 144.9631];
  const officerJson = JSON.stringify(
    officers.map((o) => ({
      lat: o.latitude,
      lng: o.longitude,
      name: o.officer?.name ?? 'Officer',
      online: o.is_online,
      initials: o.officer?.initials ?? 'O',
      color: o.is_online ? (o.officer?.avatar_color ?? '#4F46E5') : '#6B7280',
    })),
  );
  const requestJson = JSON.stringify(
    requests.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      type: r.type,
      status: r.status,
    })),
  );

  const script = `
    const map = L.map('map', { zoomControl: true }).setView([${center[0]}, ${center[1]}], 12);
    L.tileLayer('${OSM_TILES}', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const officers = ${officerJson};
    const requests = ${requestJson};
    const bounds = [];

    officers.forEach(function (o) {
      bounds.push([o.lat, o.lng]);
      const icon = L.divIcon({
        className: '',
        html: '<div class="officer-pin" style="background:' + o.color + '">' + o.initials + '</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([o.lat, o.lng], { icon: icon })
        .addTo(map)
        .bindPopup('<strong>' + o.name + '</strong><br/>' + (o.online ? 'Online' : 'Offline'));
    });

    requests.forEach(function (r) {
      bounds.push([r.lat, r.lng]);
      const icon = L.divIcon({
        className: '',
        html: '<div class="request-pin"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([r.lat, r.lng], { icon: icon })
        .addTo(map)
        .bindPopup('<strong>' + r.type + '</strong><br/>' + r.status);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 56], maxZoom: 14 });
    }
  `;

  return shell(script);
}

/** Leaflet HTML for live attendance officer pins + geofence circles. */
export function buildLiveOfficerLeafletHtml(input: {
  locations: OfficerLiveLocation[];
  geofences: Geofence[];
  focusOfficerId?: string | null;
}): string {
  const locations = input.locations.filter(
    (l) =>
      Number.isFinite(l.coordinates.latitude) && Number.isFinite(l.coordinates.longitude),
  );
  const circles = input.geofences.filter(
    (g) => g.isActive && g.geometry.shape === 'circle',
  );

  const focus = input.focusOfficerId
    ? locations.find((l) => l.officerId === input.focusOfficerId)
    : undefined;
  const center = focus
    ? [focus.coordinates.latitude, focus.coordinates.longitude]
    : locations[0]
      ? [locations[0].coordinates.latitude, locations[0].coordinates.longitude]
      : circles[0] && circles[0].geometry.shape === 'circle'
        ? [circles[0].geometry.center.latitude, circles[0].geometry.center.longitude]
        : [28.6139, 77.209];

  const locJson = JSON.stringify(
    locations.map((l) => ({
      id: l.officerId,
      lat: l.coordinates.latitude,
      lng: l.coordinates.longitude,
      name: l.officerName || 'Officer',
      initials: (l.officerName || 'O')
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      color: l.attendanceStatus === 'checked_out' ? '#6B7280' : '#4F46E5',
      status: l.attendanceStatus,
    })),
  );
  const fenceJson = JSON.stringify(
    circles
      .map((g) => {
        if (g.geometry.shape !== 'circle') return null;
        return {
          lat: g.geometry.center.latitude,
          lng: g.geometry.center.longitude,
          radius: g.geometry.radius,
          name: g.name,
        };
      })
      .filter(Boolean),
  );

  const script = `
    const map = L.map('map', { zoomControl: true }).setView([${center[0]}, ${center[1]}], ${focus ? 16 : 12});
    L.tileLayer('${OSM_TILES}', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const locations = ${locJson};
    const fences = ${fenceJson};
    const bounds = [];

    fences.forEach(function (f) {
      bounds.push([f.lat, f.lng]);
      L.circle([f.lat, f.lng], {
        radius: f.radius,
        color: '#4F46E5',
        fillColor: '#4F46E5',
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map);
    });

    locations.forEach(function (o) {
      bounds.push([o.lat, o.lng]);
      const icon = L.divIcon({
        className: '',
        html: '<div class="officer-pin" style="background:' + o.color + '">' + o.initials + '</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([o.lat, o.lng], { icon: icon })
        .addTo(map)
        .bindPopup('<strong>' + o.name + '</strong><br/>' + o.status);
    });

    const focusId = ${JSON.stringify(input.focusOfficerId ?? null)};
    if (focusId) {
      const hit = locations.find(function (o) { return o.id === focusId; });
      if (hit) map.setView([hit.lat, hit.lng], 16);
    } else if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 13);
    } else if (locations.length > 1) {
      map.fitBounds(locations.map(function (o) { return [o.lat, o.lng]; }), { padding: [48, 56], maxZoom: 14 });
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 56], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }
  `;

  return shell(script);
}
