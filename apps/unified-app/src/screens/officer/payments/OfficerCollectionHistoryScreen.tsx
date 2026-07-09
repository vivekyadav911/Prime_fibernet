import { Linking, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';

import { AmountDisplay, PaymentStatusBadge } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useGetPaymentsQuery } from '@/services/api/paymentCollectionApi';
import type { PaymentRecord } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { hasPaymentText, paymentText } from '@/utils/paymentText';
import { queryErrorMessage } from '@/utils/queryError';

type Props = { embedded?: boolean };

function PaymentMeta({ item }: { item: PaymentRecord }) {
  const upiRef = paymentText(item.gateway_payment_id);
  const notes = paymentText(item.cash_collection_notes);
  const evidenceUrl = paymentText(item.evidence_photo_url);
  const hasMeta = hasPaymentText(upiRef) || hasPaymentText(notes) || hasPaymentText(evidenceUrl);

  if (!hasMeta) return null;

  return (
    <View style={styles.metaBlock}>
      {hasPaymentText(upiRef) ? <Text style={styles.metaLine}>UPI / ref: {upiRef}</Text> : null}
      {hasPaymentText(notes) ? <Text style={styles.metaLine}>Notes: {notes}</Text> : null}
      {hasPaymentText(evidenceUrl) ? (
        <Pressable onPress={() => void Linking.openURL(evidenceUrl!)}>
          <Text style={styles.metaLink}>View evidence photo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function OfficerCollectionHistoryScreen({ embedded }: Props) {
  const officerId = useOfficerId();
  const { data, isLoading, isError, error, refetch } = useGetPaymentsQuery({
    officer_id: officerId ?? 'all',
    channel: 'officer_cash',
    pageSize: 50,
  });
  const rows = data?.rows ?? [];

  // #region agent log
  useEffect(() => {
    if (!rows.length) return;
    const sample = rows[0];
    fetch('http://127.0.0.1:7333/ingest/e1cbfe88-dbfa-476e-aa64-46550e18bd51',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bad3ec'},body:JSON.stringify({sessionId:'bad3ec',location:'OfficerCollectionHistoryScreen.tsx:render',message:'collection history rows',data:{count:rows.length,sampleStatus:sample?.status,refType:typeof sample?.gateway_payment_id,notesType:typeof sample?.cash_collection_notes},timestamp:Date.now(),hypothesisId:'H1',runId:'crash-fix'})}).catch(()=>{});
  }, [rows]);
  // #endregion

  if (!officerId) {
    return embedded ? <ErrorState message="Officer profile not found." /> : (
      <ScreenWrapper scrollable={false}>
        <ErrorState message="Officer profile not found." />
      </ScreenWrapper>
    );
  }

  if (isLoading) {
    return embedded ? (
      <SkeletonLoader rows={5} />
    ) : (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={5} />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return embedded ? (
      <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
    ) : (
      <ScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  const list = (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          title="No collections"
          subtitle="Payments you record will appear here while awaiting admin verification."
        />
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.number}>{item.payment_number || item.id.slice(0, 8)}</Text>
          <Text style={styles.customer}>{item.customer_name}</Text>
          <AmountDisplay amount={item.total_amount} />
          <PaymentStatusBadge status={item.status} />
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          <PaymentMeta item={item} />
          {item.status === 'pending_review' || item.status === 'cash_collected' ? (
            <Text style={styles.pendingHint}>Awaiting admin verification</Text>
          ) : null}
          {item.status === 'confirmed' ? (
            <Text style={styles.pendingHint}>Confirmed — invoice can be generated from admin Payments</Text>
          ) : null}
        </View>
      )}
      contentContainerStyle={embedded ? styles.embeddedList : styles.list}
    />
  );

  if (embedded) return list;

  return <ScreenWrapper scrollable={false}>{list}</ScreenWrapper>;
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.lg },
  row: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  number: { fontFamily: 'monospace', fontWeight: '700', color: colors.textPrimary },
  customer: { color: colors.textSecondary },
  date: { fontSize: 11, color: colors.textSecondary },
  metaBlock: { marginTop: spacing.xs, gap: spacing.xxs },
  metaLine: { fontSize: 12, color: colors.textSecondary },
  metaLink: { fontSize: 12, fontWeight: '600', color: colors.primaryNavy },
  pendingHint: { fontSize: 11, color: colors.amber, marginTop: spacing.xxs },
  embeddedList: { padding: spacing.md },
});
