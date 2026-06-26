import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { CustomerTopBar } from '@/components/customer/shell';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type Props = BottomTabScreenProps<CustomerTabParamList, 'Support'>;

const FAQS = [
  {
    question: 'Slow connection speed?',
    answer:
      'First, try restarting your router by unplugging it for 30 seconds. If speeds are still slow, check for active downloads or run a diagnostic test in the Plans tab.',
  },
  {
    question: 'Billing issue or unknown charge?',
    answer:
      "You can view a detailed breakdown of all charges in the Payments tab. Pro-rated charges may appear if you recently changed your plan.",
  },
  {
    question: 'Need help with router setup?',
    answer:
      'Ensure your optical network terminal is powered on. Connect the provided router to the ONT using the yellow ethernet cable. Follow the in-app setup guide for activation.',
  },
];

export function CustomerSupportHubScreen(_props: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filteredFaqs = FAQS.filter(
    (f) => !search.trim() || f.question.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <View style={styles.screen}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Support Hub</Text>
        <Text style={styles.subheading}>We&apos;re here to help keep you connected.</Text>

        <View style={styles.cardsRow}>
          <GlassCard style={[styles.card, styles.primaCard]} glow padded>
            <View style={styles.cardIconWrap}>
              <MaterialCommunityIcons name="robot-outline" size={28} color={signalGlass.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Ask Prima</Text>
            <Text style={styles.cardSub}>
              Get instant answers from our advanced AI assistant. Prima is trained to resolve most network and billing queries in seconds.
            </Text>
            <CustomerButton
              label="Start Chat"
              icon="chat-outline"
              onPress={() => navigation.navigate('SupportScreen')}
              style={styles.cardBtn}
            />
          </GlassCard>

          <GlassCard style={styles.card} padded>
            <View style={[styles.cardIconWrap, styles.agentIconWrap]}>
              <MaterialCommunityIcons name="headset" size={28} color={signalGlass.colors.onSurface} />
            </View>
            <Text style={styles.cardTitle}>Live Support</Text>
            <Text style={styles.cardSub}>
              Need human assistance? Connect directly with our technical support team for complex issues.
            </Text>
            <CustomerButton
              label="Chat with Agent"
              variant="outline"
              icon="account"
              onPress={() => navigation.navigate('CustomerLiveChat')}
              style={styles.cardBtn}
            />
          </GlassCard>
        </View>

        <GlassCard style={styles.faqCard} padded>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={signalGlass.colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FAQs..."
              placeholderTextColor={signalGlass.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search FAQs"
            />
          </View>
          {filteredFaqs.map((faq, index) => {
            const expanded = expandedIndex === index;
            return (
              <View key={faq.question} style={styles.faqItem}>
                <Pressable
                  style={styles.faqQuestion}
                  onPress={() => setExpandedIndex(expanded ? null : index)}
                  accessibilityRole="button"
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={signalGlass.colors.onSurfaceVariant}
                  />
                </Pressable>
                {expanded ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
              </View>
            );
          })}
        </GlassCard>

        <Pressable onPress={() => navigation.navigate('CustomerTicketList')} style={styles.ticketsLink}>
          <Text style={styles.ticketsLinkText}>View my tickets</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('CreateCustomerTicket')} style={styles.raiseCta}>
          <Text style={styles.raiseText}>Didn&apos;t find your answer? Raise a ticket</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  content: {
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingTop: signalGlass.spacing.md,
    paddingBottom: signalGlass.spacing.xxxl,
  },
  heading: {
    ...signalGlass.typography.displayLg,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.display,
  },
  subheading: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    marginTop: signalGlass.spacing.xs,
    marginBottom: signalGlass.spacing.lg,
  },
  cardsRow: { gap: signalGlass.spacing.sm, marginBottom: signalGlass.spacing.lg },
  card: { borderRadius: signalGlass.radius.lg },
  primaCard: {
    borderColor: 'rgba(173,198,255,0.3)',
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(173,198,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: signalGlass.spacing.sm,
  },
  agentIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: signalGlass.colors.borderGlass,
  },
  cardTitle: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
    marginBottom: signalGlass.spacing.xs,
  },
  cardSub: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    marginBottom: signalGlass.spacing.md,
  },
  cardBtn: { width: '100%' },
  faqCard: { borderRadius: signalGlass.radius.lg, marginBottom: signalGlass.spacing.md },
  faqTitle: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
    marginBottom: signalGlass.spacing.sm,
  },
  searchWrap: {
    position: 'relative',
    marginBottom: signalGlass.spacing.md,
  },
  searchIcon: { position: 'absolute', left: signalGlass.spacing.sm, top: 14, zIndex: 1 },
  searchInput: {
    backgroundColor: signalGlass.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    borderRadius: signalGlass.radius.sm,
    paddingVertical: signalGlass.spacing.sm,
    paddingLeft: 40,
    paddingRight: signalGlass.spacing.sm,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.body,
    minHeight: 48,
  },
  faqItem: {
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    borderRadius: signalGlass.radius.sm,
    marginBottom: signalGlass.spacing.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: signalGlass.spacing.sm,
    minHeight: 48,
  },
  faqQuestionText: {
    ...signalGlass.typography.bodyMedium,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
    flex: 1,
    paddingRight: signalGlass.spacing.sm,
  },
  faqAnswer: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    paddingHorizontal: signalGlass.spacing.sm,
    paddingBottom: signalGlass.spacing.sm,
  },
  ticketsLink: { alignItems: 'center', marginBottom: signalGlass.spacing.sm },
  ticketsLinkText: { color: signalGlass.colors.primary, fontFamily: signalGlass.fonts.bodyMedium },
  raiseCta: {
    padding: signalGlass.spacing.lg,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.primary,
    alignItems: 'center',
  },
  raiseText: { color: signalGlass.colors.primary, fontWeight: '600', fontFamily: signalGlass.fonts.bodyMedium },
});
