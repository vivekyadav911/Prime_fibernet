export interface OfficerLocation {
  id: string;
  officer_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  battery_level: number | null;
  is_online: boolean;
  is_moving: boolean;
  last_seen_at: string;
  updated_at: string;
  officer?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    avatar_color?: string;
    initials?: string;
  };
}

export interface LocationHistoryPoint {
  id: string;
  officer_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_moving: boolean;
  recorded_at: string;
}

export interface OfficerDwell {
  id: string;
  officer_id: string;
  latitude: number;
  longitude: number;
  radius_metres: number;
  arrived_at: string;
  departed_at: string | null;
  duration_minutes: number | null;
  address: string | null;
  date: string;
}

export interface OfficerDailyActivity {
  id: string;
  officer_id: string;
  date: string;
  total_distance_km: number;
  total_time_active_minutes: number;
  total_stops: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  first_ping_at: string | null;
  last_ping_at: string | null;
  total_pings: number;
}

export type TimeRange = 'all_day' | 'morning' | 'afternoon' | 'evening';

export type MapStyle = 'standard' | 'satellite' | 'terrain';

export interface MapControlState {
  selectedDate: string;
  timeRange: TimeRange;
  selectedOfficerIds: string[];
  showOfficers: boolean;
  showTrails: boolean;
  showDwellTime: boolean;
  showRequests: boolean;
  mapStyle: MapStyle;
  isPanelOpen: boolean;
}

export type MapControlAction =
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIME_RANGE'; timeRange: TimeRange }
  | { type: 'TOGGLE_OFFICER'; officerId: string }
  | { type: 'SELECT_ALL_OFFICERS'; officerIds: string[] }
  | { type: 'DESELECT_ALL_OFFICERS' }
  | { type: 'SET_SHOW_OFFICERS'; value: boolean }
  | { type: 'SET_SHOW_TRAILS'; value: boolean }
  | { type: 'SET_SHOW_DWELL'; value: boolean }
  | { type: 'SET_SHOW_REQUESTS'; value: boolean }
  | { type: 'SET_MAP_STYLE'; style: MapStyle }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'SET_PANEL_OPEN'; open: boolean };

export interface ActivityStats {
  distance_km: number;
  time_active_minutes: number;
  stops: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  first_ping_at: string | null;
  last_ping_at: string | null;
}

export interface TrailSegment {
  officerId: string;
  color: string;
  points: Array<{ latitude: number; longitude: number; speed: number | null }>;
}

export interface GeofenceEvent {
  id: string;
  officer_id: string;
  geofence_id: string;
  event_type: 'enter' | 'exit';
  latitude: number | null;
  longitude: number | null;
  occurred_at: string;
}

export const TIME_RANGES: Record<TimeRange, { start: number; end: number }> = {
  all_day: { start: 0, end: 24 },
  morning: { start: 6, end: 12 },
  afternoon: { start: 12, end: 18 },
  evening: { start: 18, end: 24 },
};

export const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;
