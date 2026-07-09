import { getPortalItemCoordinates, isUsableMapCoordinate } from '@/utils/officerPortalCoordinates';
import type { PortalTicketItem } from '@/types/portalTicket';

describe('isUsableMapCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(isUsableMapCoordinate(28.6139, 77.209)).toBe(true);
  });

  it('rejects null island placeholder', () => {
    expect(isUsableMapCoordinate(0, 0)).toBe(false);
  });

  it('rejects out of range latitude', () => {
    expect(isUsableMapCoordinate(999, 77)).toBe(false);
  });
});

describe('getPortalItemCoordinates', () => {
  const baseItem = {
    id: '1',
    kind: 'request',
    customerAddress: 'Test address',
  } as PortalTicketItem;

  it('reads ticket lat/lng columns', () => {
    const coords = getPortalItemCoordinates(baseItem, null, { lat: 28.61, lng: 77.2, address: 'A' });
    expect(coords).toEqual({ latitude: 28.61, longitude: 77.2, address: 'A' });
  });

  it('ignores invalid coordinates', () => {
    const coords = getPortalItemCoordinates(baseItem, null, { lat: 0, lng: 0, address: 'A' });
    expect(coords).toBeNull();
  });
});
