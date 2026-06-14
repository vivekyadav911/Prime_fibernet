import type { Coordinates } from '@/types/attendance';

export type GeofenceLocationPickerProps = {
  center: Coordinates;
  radius: number;
  onCenterChange: (center: Coordinates) => void;
  mapHeight?: number;
};

export const DEFAULT_MAP_DELTA = 0.02;
