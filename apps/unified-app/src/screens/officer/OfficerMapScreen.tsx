import { StyleSheet, Text } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

export function OfficerMapScreen() {
  return (
    <Screen>
      <EmptyState
        title="Map view"
        description="Integrate react-native-maps with Google Maps API key (OFF-003). Request pins by priority will render here."
      />
      <Text style={styles.note}>Officer live location + navigation CTAs per frontend spec §3.3</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 16, color: colors.textSecondary, textAlign: 'center' },
});
