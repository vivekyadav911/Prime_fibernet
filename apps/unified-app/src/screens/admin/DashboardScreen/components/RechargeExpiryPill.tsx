import { StyleSheet, Text, View } from 'react-native';

import { dash } from '../dashboardUi';

type RechargeExpiryPillProps = {
  daysRemaining: number;
};

function pillStyle(days: number): { bg: string; text: string; label: string } {
  if (days <= 0) {
    return { bg: '#FEE2E2', text: dash.danger, label: days === 0 ? 'Today' : 'Overdue' };
  }
  if (days < 7) {
    return { bg: '#FEF3C7', text: '#B45309', label: `${days}d` };
  }
  return { bg: '#D1FAE5', text: '#047857', label: `${days}d` };
}

export function RechargeExpiryPill({ daysRemaining }: RechargeExpiryPillProps) {
  const s = pillStyle(daysRemaining);

  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: dash.expiryPillH,
    paddingHorizontal: 10,
    borderRadius: dash.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
