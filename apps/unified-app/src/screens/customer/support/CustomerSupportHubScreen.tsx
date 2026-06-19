import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GlassCard } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type Props = BottomTabScreenProps<CustomerTabParamList, 'Support'>;

const OPTIONS = [
  {
    title: 'Ask Prima',
    subtitle: 'AI assistant for instant answers',
    route: 'SupportScreen' as const,
    icon: '🤖',
  },
  {
    title: 'Chat with agent',
    subtitle: 'Talk to support in real time',
    route: 'CustomerLiveChat' as const,
    icon: '💬',
  },
  {
    title: 'My tickets',
    subtitle: 'Track complaints and requests',
    route: 'CustomerTicketList' as const,
    icon: '🎫',
  },
  {
    title: 'Browse FAQs',
    subtitle: 'Common questions answered',
    route: 'CustomerFaqList' as const,
    icon: '📋',
  },
];

export function CustomerSupportHubScreen({}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>How can we help?</Text>
      {OPTIONS.map((opt) => (
        <Pressable key={opt.route} onPress={() => navigation.navigate(opt.route)}>
          <GlassCard style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.icon}>{opt.icon}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardSub}>{opt.subtitle}</Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>
      ))}
      <Pressable onPress={() => navigation.navigate('CreateCustomerTicket')}>
        <View style={styles.raiseCta}>
          <Text style={styles.raiseText}>Didn't find your answer? Raise a ticket</Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  content: { padding: signalGlass.spacing.lg, gap: signalGlass.spacing.md },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    marginBottom: signalGlass.spacing.sm,
  },
  card: { marginBottom: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: signalGlass.spacing.md },
  icon: { fontSize: 32 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  cardSub: {
    fontSize: 13,
    color: signalGlass.colors.textSecondary,
    marginTop: 4,
  },
  raiseCta: {
    marginTop: signalGlass.spacing.lg,
    padding: signalGlass.spacing.lg,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.accentPrimary,
    alignItems: 'center',
  },
  raiseText: { color: signalGlass.colors.accentGlow, fontWeight: '600' },
});
