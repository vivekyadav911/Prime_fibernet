import { formatDistanceMeters, formatOutsideZoneDistance } from '@/utils/formatDistance';

describe('formatDistanceMeters', () => {
  it('returns null for Infinity and invalid values', () => {
    expect(formatDistanceMeters(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatDistanceMeters(Number.NaN)).toBeNull();
    expect(formatDistanceMeters(undefined)).toBeNull();
  });

  it('formats finite distances', () => {
    expect(formatDistanceMeters(142)).toBe('142m away');
    expect(formatDistanceMeters(1500)).toBe('1.5km away');
  });
});

describe('formatOutsideZoneDistance', () => {
  it('includes zone radius when provided', () => {
    expect(formatOutsideZoneDistance(142, 100)).toBe('142m away — outside 100m zone');
  });
});
