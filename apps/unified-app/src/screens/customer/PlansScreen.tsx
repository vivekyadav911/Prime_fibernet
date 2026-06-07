import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Screen, colors } from '@prime/ui';
import type { Plan, PaymentGateway } from '@prime/types';

import { PaymentCheckoutWebView } from '@/components/PaymentCheckoutWebView';
import { useAppSelector } from '@/store/hooks';
import {
  useCreatePaymentOrderMutation,
  useGetPlansQuery,
  useGetPublicCompanySettingsQuery,
  useVerifyPaymentMutation,
} from '@/store/api/endpoints';

export function PlansScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, error, refetch } = useGetPlansQuery();
  const { data: settings } = useGetPublicCompanySettingsQuery();
  const [createOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkout, setCheckout] = useState<{
    url: string | null;
    paymentId: string;
    orderId: string;
    gateway: PaymentGateway;
  } | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const onSubscribe = async (plan: Plan) => {
    if (!user) return;
    setSubscribing(true);
    try {
      const result = await createOrder({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
      }).unwrap();
      setCheckout({
        url: result.checkoutUrl,
        paymentId: result.paymentId,
        orderId: result.orderId,
        gateway: result.gateway,
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load plans" onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primaryNavy} />
      </Screen>
    );
  }

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No plans available" description="Check back later" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Text style={styles.gatewayNote}>
        Payments via {(settings?.payment_gateway as string) ?? 'easybuzz'}
      </Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setSelectedPlan(item)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.speedMbps} Mbps · ₹{item.price} · {item.validityDays} days
            </Text>
            <Text style={styles.cta} onPress={() => onSubscribe(item)}>
              {subscribing ? 'Processing…' : 'Subscribe'}
            </Text>
          </Pressable>
        )}
      />
      <Modal visible={!!selectedPlan} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPlan ? (
              <>
                <Text style={styles.name}>{selectedPlan.name}</Text>
                <Text style={styles.meta}>{selectedPlan.speedMbps} Mbps</Text>
                {selectedPlan.features.map((f) => (
                  <Text key={f} style={styles.feature}>• {f}</Text>
                ))}
                <Text style={styles.price}>₹{selectedPlan.price}</Text>
                <Text style={styles.cta} onPress={() => { onSubscribe(selectedPlan); setSelectedPlan(null); }}>
                  Subscribe now
                </Text>
                <Text style={styles.close} onPress={() => setSelectedPlan(null)}>Close</Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <PaymentCheckoutWebView
        visible={!!checkout}
        checkoutUrl={checkout?.url ?? null}
        paymentId={checkout?.paymentId ?? ''}
        orderId={checkout?.orderId ?? ''}
        gateway={checkout?.gateway ?? 'easybuzz'}
        onClose={() => setCheckout(null)}
        onSuccess={() => refetch()}
        onVerify={(p) => verifyPayment(p).unwrap().then(() => undefined)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gatewayNote: { padding: 12, color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  feature: { color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: 22, fontWeight: '700', color: colors.primaryNavy, marginTop: 8 },
  cta: { color: colors.accentTeal, fontWeight: '600', marginTop: 12 },
  close: { color: colors.textSecondary, marginTop: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, padding: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});
