import { StyleSheet, Text, View } from 'react-native';

import { AvatarIcon } from '@/components/admin';
import type { UpcomingRecharge } from '@/types/api/admin';
import { formatINR } from '@/utils/planUtils';

import { dash } from '../dashboardUi';
import { RechargeExpiryPill } from './RechargeExpiryPill';

type RechargeCustomerRowProps = {
  item: UpcomingRecharge;
};

export function RechargeCustomerRow({ item }: RechargeCustomerRowProps) {
  return (
    <View style={styles.row}>
      <AvatarIcon name={item.customerName} size={dash.avatar} />
      <View style={styles.main}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {item.customerName}
          </Text>
          <RechargeExpiryPill daysRemaining={item.daysRemaining} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.planName} · {formatINR(item.price)} · {item.phone || '—'}
        </Text>
        <Text style={styles.expiry} numberOfLines={1}>
          Expires {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {item.city ? ` · ${item.city}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: dash.rowH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: dash.text,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: dash.textSecondary,
    lineHeight: 16,
  },
  expiry: {
    fontSize: 12,
    fontWeight: '500',
    color: dash.textSecondary,
    lineHeight: 15,
  },
});
