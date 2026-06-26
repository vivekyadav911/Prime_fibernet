import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { CustomerTopBar } from '@/components/customer/shell';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
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
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
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
              <MaterialCommunityIcons name="robot-outline" size={28} color={theme.colors.primary} />
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
              <MaterialCommunityIcons name="headset" size={28} color={theme.colors.onSurface} />
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
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FAQs..."
              placeholderTextColor={theme.colors.textMuted}
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
                    color={theme.colors.onSurfaceVariant}
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
    },
    heading: {
      ...theme.typography.displayLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.display,
    },
    subheading: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    cardsRow: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
    card: { borderRadius: theme.radius.lg },
    primaCard: {
      borderColor: 'rgba(173,198,255,0.3)',
    },
    cardIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderWidth: 1,
      borderColor: 'rgba(173,198,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    agentIconWrap: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderColor: theme.colors.borderGlass,
    },
    cardTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginBottom: theme.spacing.xs,
    },
    cardSub: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginBottom: theme.spacing.md,
    },
    cardBtn: { width: '100%' },
    faqCard: { borderRadius: theme.radius.lg, marginBottom: theme.spacing.md },
    faqTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginBottom: theme.spacing.sm,
    },
    searchWrap: {
      position: 'relative',
      marginBottom: theme.spacing.md,
    },
    searchIcon: { position: 'absolute', left: theme.spacing.sm, top: 14, zIndex: 1 },
    searchInput: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.sm,
      paddingVertical: theme.spacing.sm,
      paddingLeft: 40,
      paddingRight: theme.spacing.sm,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
      minHeight: 48,
    },
    faqItem: {
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.sm,
      marginBottom: theme.spacing.sm,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.02)',
    },
    faqQuestion: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.sm,
      minHeight: 48,
    },
    faqQuestionText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      flex: 1,
      paddingRight: theme.spacing.sm,
    },
    faqAnswer: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    ticketsLink: { alignItems: 'center', marginBottom: theme.spacing.sm },
    ticketsLinkText: { color: theme.colors.primary, fontFamily: theme.fonts.bodyMedium },
    raiseCta: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      alignItems: 'center',
    },
    raiseText: { color: theme.colors.primary, fontWeight: '600', fontFamily: theme.fonts.bodyMedium },
  });
