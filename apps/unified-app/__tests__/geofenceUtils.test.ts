import {
  circleToPolygon,
  getDistanceMeters,
  isInsideCircle,
  isInsideGeofence,
  isInsidePolygon,
  validateGeofence,
} from '@/utils/geofenceUtils';
import type { Geofence } from '@/types/attendance';

const DELHI_OFFICE: { latitude: number; longitude: number } = {
  latitude: 28.6139,
  longitude: 77.209,
};

describe('geofenceUtils', () => {
  describe('isInsideCircle', () => {
    it('returns true at center', () => {
      expect(isInsideCircle(DELHI_OFFICE, DELHI_OFFICE, 200)).toBe(true);
    });

    it('returns true at edge within radius', () => {
      const nearCenter = { latitude: 28.614, longitude: 77.209 };
      expect(isInsideCircle(nearCenter, DELHI_OFFICE, 200)).toBe(true);
    });

    it('returns false just outside radius', () => {
      const far = { latitude: 28.62, longitude: 77.22 };
      expect(isInsideCircle(far, DELHI_OFFICE, 200)).toBe(false);
    });

    it('returns false for zero radius', () => {
      expect(isInsideCircle(DELHI_OFFICE, DELHI_OFFICE, 0)).toBe(false);
    });
  });

  describe('isInsidePolygon', () => {
    const square = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
      { latitude: 1, longitude: 0 },
    ];

    it('returns true for point inside convex polygon', () => {
      expect(isInsidePolygon({ latitude: 0.5, longitude: 0.5 }, square)).toBe(true);
    });

    it('returns false for point outside', () => {
      expect(isInsidePolygon({ latitude: 2, longitude: 2 }, square)).toBe(false);
    });

    it('returns false for fewer than 3 vertices', () => {
      expect(
        isInsidePolygon(
          { latitude: 0.5, longitude: 0.5 },
          [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 1 },
          ],
        ),
      ).toBe(false);
    });

    it('handles concave polygon', () => {
      const concave = [
        { latitude: 0, longitude: 0 },
        { latitude: 2, longitude: 0 },
        { latitude: 2, longitude: 2 },
        { latitude: 1, longitude: 1 },
        { latitude: 0, longitude: 2 },
      ];
      expect(isInsidePolygon({ latitude: 0.5, longitude: 0.5 }, concave)).toBe(true);
      expect(isInsidePolygon({ latitude: 1.5, longitude: 1.5 }, concave)).toBe(false);
    });
  });

  describe('getDistanceMeters', () => {
    it('returns 0 for same point', () => {
      expect(getDistanceMeters(DELHI_OFFICE, DELHI_OFFICE)).toBeCloseTo(0, 1);
    });

    it('calculates known distance accurately', () => {
      const mumbai = { latitude: 19.076, longitude: 72.8777 };
      const dist = getDistanceMeters(DELHI_OFFICE, mumbai);
      expect(dist).toBeGreaterThan(1_100_000);
      expect(dist).toBeLessThan(1_200_000);
    });
  });

  describe('isInsideGeofence', () => {
    const circleGeofence: Geofence = {
      id: '1',
      name: 'Office',
      address: '',
      city: '',
      state: '',
      isActive: true,
      geometry: { shape: 'circle', center: DELHI_OFFICE, radius: 500 },
      assignedOfficers: [],
      createdBy: '',
      createdAt: '',
      updatedAt: '',
    };

    it('works for circle geofence', () => {
      expect(isInsideGeofence(DELHI_OFFICE, circleGeofence)).toBe(true);
    });
  });

  describe('circleToPolygon', () => {
    it('generates requested number of points', () => {
      expect(circleToPolygon(DELHI_OFFICE, 100, 32)).toHaveLength(32);
    });

    it('defaults to 64 points', () => {
      expect(circleToPolygon(DELHI_OFFICE, 100)).toHaveLength(64);
    });
  });

  describe('validateGeofence', () => {
    it('rejects radius below minimum', () => {
      const result = validateGeofence({
        shape: 'circle',
        center: DELHI_OFFICE,
        radius: 30,
      });
      expect(result.valid).toBe(false);
    });

    it('accepts valid circle', () => {
      const result = validateGeofence({
        shape: 'circle',
        center: DELHI_OFFICE,
        radius: 200,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects polygon with 2 vertices', () => {
      const result = validateGeofence({
        shape: 'polygon',
        vertices: [
          { latitude: 0, longitude: 0 },
          { latitude: 1, longitude: 1 },
        ],
      });
      expect(result.valid).toBe(false);
    });
  });
});
