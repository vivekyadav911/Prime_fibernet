import { StyleSheet, Text } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useClockInMutation, useClockOutMutation } from '@/store/api/endpoints';

export function OfficerShiftsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [clockIn] = useClockInMutation();
  const [clockOut] = useClockOutMutation();

  return (
    <Screen>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.subtitle}>GPS coordinates recorded on clock in/out (OFF-004)</Text>
      <Button
        label="Clock in"
        onPress={() => clockIn({ officerId: user?.id ?? '', latitude: 0, longitude: 0 })}
        style={styles.btn}
      />
      <Button label="Clock out" variant="secondary" onPress={() => clockOut({ shiftId: 'latest' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: colors.textSecondary, marginVertical: 12 },
  btn: { marginBottom: 12 },
});
