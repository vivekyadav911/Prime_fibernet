import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';
import { colors } from '@/theme/colors';
import type { OfficerLiveLocation } from '@/types/attendance';

type Props = {
  location: OfficerLiveLocation;
  colorIndex: number;
};

export function LiveOfficerMarker({ location, colorIndex }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const color = getOfficerColor(location.officerName, colorIndex);
  const initials = getOfficerInitials(location.officerName);
  const isLive = location.attendanceStatus === 'checked_in';

  useEffect(() => {
    if (!isLive) return undefined;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.45, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isLive, pulse]);

  const markerColor =
    location.attendanceStatus === 'checked_out' ? colors.textSecondary : color;

  return (
    <Marker
      coordinate={location.coordinates}
      title={location.officerName}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.wrap}>
        {isLive ? (
          <Animated.View
            style={[
              styles.pulse,
              { borderColor: markerColor, transform: [{ scale: pulse }] },
            ]}
          />
        ) : null}
        <View style={[styles.circle, { backgroundColor: markerColor }]}>
          <Text style={styles.initials}>{initials}</Text>
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
    opacity: 0.4,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  initials: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
