import { StyleSheet, Text, View } from 'react-native';
import { Circle, Marker } from 'react-native-maps';

import { MAP_THEME } from '@/constants/mapTheme';
import { colors } from '@/theme/colors';
import type { OfficerDwell } from '@/types/map';

type Props = {
  dwell: OfficerDwell;
};

export function DwellCircle({ dwell }: Props) {
  const label =
    dwell.duration_minutes != null
      ? `${dwell.duration_minutes}m`
      : dwell.departed_at
        ? ''
        : '…';

  return (
    <>
      <Circle
        center={{ latitude: dwell.latitude, longitude: dwell.longitude }}
        radius={dwell.radius_metres}
        fillColor={MAP_THEME.dwellFill}
        strokeColor={MAP_THEME.dwellStroke}
        strokeWidth={2}
      />
      {label ? (
        <Marker
          coordinate={{ latitude: dwell.latitude, longitude: dwell.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.label}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        </Marker>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    backgroundColor: MAP_THEME.dwellStroke,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  labelText: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
