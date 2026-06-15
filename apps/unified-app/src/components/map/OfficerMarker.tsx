import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';
import { colors } from '@/theme/colors';
import type { OfficerLocation } from '@/types/map';
import { OFFLINE_THRESHOLD_MS } from '@/types/map';

type Props = {
  officer: OfficerLocation;
  colorIndex: number;
  onPress: () => void;
};

export function OfficerMarker({ officer, colorIndex, onPress }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const name = officer.officer?.name ?? 'Officer';
  const color = officer.officer?.avatar_color ?? getOfficerColor(name, colorIndex);
  const initials = officer.officer?.initials ?? getOfficerInitials(name);
  const isOffline =
    Date.now() - new Date(officer.last_seen_at).getTime() > OFFLINE_THRESHOLD_MS;

  useEffect(() => {
    if (!officer.is_moving || isOffline) return undefined;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [officer.is_moving, isOffline, pulse]);

  const markerColor = isOffline ? colors.textSecondary : color;

  return (
    <Marker
      coordinate={{ latitude: officer.latitude, longitude: officer.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.wrap}>
        {officer.is_moving && !isOffline ? (
          <Animated.View
            style={[
              styles.pulse,
              { borderColor: markerColor, transform: [{ scale: pulse }] },
            ]}
          />
        ) : null}
        <View style={[styles.circle, { backgroundColor: markerColor }]}>
          <Text style={styles.initials}>{initials}</Text>
          {officer.is_moving && officer.heading != null ? (
            <View
              style={[
                styles.heading,
                { transform: [{ rotate: `${officer.heading}deg` }] },
              ]}
            />
          ) : null}
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  pulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    opacity: 0.35,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  initials: { color: colors.white, fontWeight: '700', fontSize: 13 },
  heading: {
    position: 'absolute',
    top: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.white,
  },
});
