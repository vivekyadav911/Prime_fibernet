import {
  coordinatesEqual,
  formatCoordinatePair,
  parseCoordinatePair,
} from '@/utils/coordinates';

describe('parseCoordinatePair', () => {
  it('parses comma-separated pair', () => {
    const result = parseCoordinatePair('28.6139, 77.209');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coordinates.latitude).toBeCloseTo(28.6139);
      expect(result.coordinates.longitude).toBeCloseTo(77.209);
    }
  });

  it('parses space-separated pair', () => {
    const result = parseCoordinatePair('28.6139 77.209');
    expect(result.ok).toBe(true);
  });

  it('parses separate lat and lng fields', () => {
    const result = parseCoordinatePair('28.6139', '77.209');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coordinates.latitude).toBeCloseTo(28.6139);
      expect(result.coordinates.longitude).toBeCloseTo(77.209);
    }
  });

  it('rejects out-of-range latitude', () => {
    const result = parseCoordinatePair('91, 77');
    expect(result.ok).toBe(false);
  });

  it('rejects out-of-range longitude', () => {
    const result = parseCoordinatePair('28, 181');
    expect(result.ok).toBe(false);
  });

  it('rejects latitude without longitude', () => {
    const result = parseCoordinatePair('28.6139');
    expect(result.ok).toBe(false);
  });
});

describe('formatCoordinatePair', () => {
  it('formats to fixed decimals', () => {
    expect(
      formatCoordinatePair({ latitude: 28.6139123, longitude: 77.2090456 }),
    ).toEqual({
      latitude: '28.613912',
      longitude: '77.209046',
    });
  });
});

describe('coordinatesEqual', () => {
  it('returns true for nearly equal coordinates', () => {
    expect(
      coordinatesEqual(
        { latitude: 28.6139, longitude: 77.209 },
        { latitude: 28.6139000001, longitude: 77.2090000001 },
      ),
    ).toBe(true);
  });

  it('returns false for different coordinates', () => {
    expect(
      coordinatesEqual(
        { latitude: 28.6139, longitude: 77.209 },
        { latitude: 28.62, longitude: 77.22 },
      ),
    ).toBe(false);
  });
});
