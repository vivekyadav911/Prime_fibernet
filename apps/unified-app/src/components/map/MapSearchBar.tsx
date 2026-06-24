import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { SavedMapPlaces } from '@/hooks/useSavedMapPlaces';
import { searchAddressSuggestions } from '@/services/GeocodingService';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Geofence, OfficerLiveLocation } from '@/types/attendance';

export type MapSearchResultKind = 'officer' | 'home' | 'office' | 'geofence' | 'address';

export type MapSearchResult = {
  id: string;
  kind: MapSearchResultKind;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

const KIND_LABELS: Record<MapSearchResultKind, string> = {
  officer: 'Officer',
  home: 'Home',
  office: 'Office',
  geofence: 'Geofence',
  address: 'Address',
};

type MapSearchBarProps = {
  officers: OfficerLiveLocation[];
  geofences: Geofence[];
  savedPlaces: SavedMapPlaces;
  onSelect: (result: MapSearchResult) => void;
};

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

function buildLocalResults(
  query: string,
  officers: OfficerLiveLocation[],
  geofences: Geofence[],
  savedPlaces: SavedMapPlaces,
): MapSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];

  const results: MapSearchResult[] = [];

  if (savedPlaces.home && (q === 'home' || matchesQuery(savedPlaces.home.label, q))) {
    results.push({
      id: 'saved-home',
      kind: 'home',
      title: savedPlaces.home.label,
      subtitle: 'Saved home location',
      latitude: savedPlaces.home.latitude,
      longitude: savedPlaces.home.longitude,
    });
  }

  if (savedPlaces.office && (q === 'office' || q === 'work' || matchesQuery(savedPlaces.office.label, q))) {
    results.push({
      id: 'saved-office',
      kind: 'office',
      title: savedPlaces.office.label,
      subtitle: 'Saved office location',
      latitude: savedPlaces.office.latitude,
      longitude: savedPlaces.office.longitude,
    });
  }

  for (const officer of officers) {
    if (matchesQuery(officer.officerName, q)) {
      results.push({
        id: `officer-${officer.officerId}`,
        kind: 'officer',
        title: officer.officerName,
        subtitle: officer.isInsideGeofence ? 'Inside geofence' : 'Outside geofence',
        latitude: officer.coordinates.latitude,
        longitude: officer.coordinates.longitude,
      });
    }
  }

  for (const fence of geofences) {
    const haystack = [fence.name, fence.address, fence.city, fence.state].filter(Boolean).join(' ');
    if (matchesQuery(haystack, q) && fence.geometry.shape === 'circle') {
      results.push({
        id: `geofence-${fence.id}`,
        kind: 'geofence',
        title: fence.name,
        subtitle: [fence.address, fence.city].filter(Boolean).join(', '),
        latitude: fence.geometry.center.latitude,
        longitude: fence.geometry.center.longitude,
      });
    }
  }

  return results;
}

export function MapSearchBar({ officers, geofences, savedPlaces, onSelect }: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [addressResults, setAddressResults] = useState<MapSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focused, setFocused] = useState(false);

  const localResults = useMemo(
    () => buildLocalResults(query, officers, geofences, savedPlaces),
    [geofences, officers, query, savedPlaces],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setAddressResults([]);
      setIsSearching(false);
      return undefined;
    }

    let active = true;
    setIsSearching(true);
    const timer = setTimeout(() => {
      void searchAddressSuggestions(trimmed, 4)
        .then((items) => {
          if (!active) return;
          setAddressResults(
            items.map((item, index) => ({
              id: `address-${index}-${item.latitude}-${item.longitude}`,
              kind: 'address' as const,
              title: item.formattedAddress?.split(',')[0] ?? trimmed,
              subtitle: item.formattedAddress,
              latitude: item.latitude,
              longitude: item.longitude,
            })),
          );
        })
        .catch(() => {
          if (active) setAddressResults([]);
        })
        .finally(() => {
          if (active) setIsSearching(false);
        });
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleResults = useMemo(() => {
    const merged = [...localResults];
    const seen = new Set(merged.map((r) => `${r.latitude},${r.longitude}`));
    for (const item of addressResults) {
      const key = `${item.latitude},${item.longitude}`;
      if (!seen.has(key)) {
        merged.push(item);
        seen.add(key);
      }
    }
    return merged.slice(0, 8);
  }, [addressResults, localResults]);

  const showDropdown = focused && query.trim().length > 0;

  const handleSelect = useCallback(
    (result: MapSearchResult) => {
      onSelect(result);
      setQuery('');
      setAddressResults([]);
      setFocused(false);
      Keyboard.dismiss();
    },
    [onSelect],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search officers, home, office, or address"
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching ? <ActivityIndicator size="small" color={adminColors.primary} /> : null}
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery('');
              setAddressResults([]);
            }}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          {visibleResults.length === 0 && !isSearching ? (
            <Text style={styles.emptyText}>No matches found</Text>
          ) : (
            visibleResults.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>{KIND_LABELS[item.kind]}</Text>
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    gap: spacing.xs,
  },
  searchIcon: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    padding: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  resultRowPressed: {
    backgroundColor: adminColors.primaryTint,
  },
  resultBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 58,
    alignItems: 'center',
  },
  resultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
