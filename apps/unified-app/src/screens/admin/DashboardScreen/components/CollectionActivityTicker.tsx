import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { useRecentOfficerCollections } from '@/hooks/usePayments';
import { paymentCollectionApi } from '@/services/api/paymentCollectionApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { pageLayout } from '@/theme/pageLayout';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';

const CHANNEL_NAME = 'admin-collection-activity';
let sharedChannel: RealtimeChannel | null = null;
let subscriberCount = 0;

function ensureActivityChannel(onInsert: () => void) {
  if (sharedChannel) return sharedChannel;

  const client = getSupabase();
  sharedChannel = client
    .channel(CHANNEL_NAME)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, onInsert)
    .subscribe();

  return sharedChannel;
}

function releaseActivityChannel(): void {
  if (subscriberCount > 0 || !sharedChannel) return;
  void getSupabase().removeChannel(sharedChannel);
  sharedChannel = null;
}

export function CollectionActivityTicker() {
  const dispatch = useAppDispatch();
  const { data, refetch } = useRecentOfficerCollections(8);
  const [tick, setTick] = useState(0);
  const onInsertRef = useRef<() => void>(() => undefined);

  onInsertRef.current = () => {
    dispatch(paymentCollectionApi.util.invalidateTags(['Payments', 'Analytics']));
    void refetch();
    setTick((n) => n + 1);
  };

  useEffect(() => {
    subscriberCount += 1;
    ensureActivityChannel(() => onInsertRef.current());

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      releaseActivityChannel();
    };
  }, [dispatch]);

  const items = data ?? [];
  if (!items.length) return null;

  const headline = items[tick % items.length];
  if (!headline) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>LIVE COLLECTIONS</Text>
      <View style={styles.ticker}>
        <Text style={styles.text} numberOfLines={2}>
          {headline.customer_name} · {formatINR(headline.total_amount)} via {headline.method} ·{' '}
          {new Date(headline.created_at).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  ticker: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
  },
  text: { color: colors.textPrimary, fontWeight: '600' },
});
