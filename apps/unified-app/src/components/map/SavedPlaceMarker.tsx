import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { SavedMapPlace } from '@/hooks/useSavedMapPlaces';
import { colors } from '@/theme/colors';

const PLACE_STYLES = {
  home: { bg: '#2563EB', icon: '⌂', label: 'Home' },
  office: { bg: '#7C3AED', icon: '▣', label: 'Office' },
} as const;

type Props = {
  place: SavedMapPlace;
};

export function SavedPlaceMarker({ place }: Props) {
  const theme = PLACE_STYLES[place.type];

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      title={place.label}
      description={theme.label}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.wrap}>
        <View style={[styles.pin, { backgroundColor: theme.bg }]}>
          <Text style={styles.icon}>{theme.icon}</Text>
        </View>
        <View style={[styles.stem, { backgroundColor: theme.bg }]} />
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{place.label}</Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  icon: { color: colors.white, fontSize: 16, fontWeight: '700' },
  stem: {
    width: 3,
    height: 8,
    borderRadius: 2,
    marginTop: -1,
  },
  labelWrap: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
