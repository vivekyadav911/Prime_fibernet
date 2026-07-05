import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import {
  CustomerBadge,
  CustomerButton,
  CustomerCard,
  CustomerEmptyState,
  CustomerSkeletonLoader,
  GlassCard,
} from '@/components/customer/ui';
import { CustomerTopBar } from '@/components/customer/shell';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { usePrimaAvailability } from '@/hooks/usePrimaAvailability';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGetFaqsAdminQuery } from '@/services/api/adminSupportApi';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type Props = BottomTabScreenProps<CustomerTabParamList, 'Support'>;

type FaqItem = { id: string; question: string; answer: string };

const FALLBACK_FAQS: FaqItem[] = [
  {
    id: 'fallback-speed',
    question: 'Slow connection speed?',
    answer:
      'First, try restarting your router by unplugging it for 30 seconds. If speeds are still slow, check for active downloads or run a diagnostic test in the Plans tab.',
  },
  {
    id: 'fallback-billing',
    question: 'Billing issue or unknown charge?',
    answer:
      'You can view a detailed breakdown of all charges in the Payments tab. Pro-rated charges may appear if you recently changed your plan.',
  },
  {
    id: 'fallback-router',
    question: 'Need help with router setup?',
    answer:
      'Ensure your optical network terminal is powered on. Connect the provided router to the ONT using the yellow ethernet cable. Follow the in-app setup guide for activation.',
  },
];

export function CustomerSupportHubScreen(_props: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const { userId } = useCustomerIdentity();
  const primaStatus = usePrimaAvailability(userId);
  const { data: publishedFaqs, isLoading: faqsLoading } = useGetFaqsAdminQuery({ publishedOnly: true });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const faqItems = useMemo<FaqItem[]>(() => {
    if (publishedFaqs?.length) {
      return publishedFaqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
      }));
    }
    return FALLBACK_FAQS;
  }, [publishedFaqs]);

  const filteredFaqs = faqItems.filter(
    (f) => !search.trim() || f.question.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const primaUnavailable = primaStatus === 'unavailable';

  return (
    <View style={styles.screen}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Support Hub</Text>
        <Text style={styles.subheading}>We&apos;re here to help keep you connected.</Text>

        <View style={styles.funnel}>
          <CustomerCard style={styles.funnelCard} glow contentStyle={styles.funnelCardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, styles.primaIconWrap]}>
                <MaterialCommunityIcons name="robot-outline" size={28} color={theme.colors.primary} />
              </View>
              <CustomerBadge label="AI assistant" tone="info" />
            </View>
            <Text style={styles.cardTitle}>Ask Prima</Text>
            <Text style={styles.cardSub}>
              Get instant answers from our AI assistant. Prima can help with billing, plans, and common network issues.
            </Text>
            {primaUnavailable ? (
              <View style={styles.unavailableBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.accentWarning} />
                <Text style={styles.unavailableText}>Prima is temporarily unavailable. Try again shortly or chat with an agent.</Text>
              </View>
            ) : null}
            <CustomerButton
              label={primaStatus === 'checking' ? 'Checking…' : 'Start Chat'}
              icon="chat-outline"
              onPress={() => navigation.navigate('SupportScreen')}
              disabled={primaUnavailable || primaStatus === 'checking'}
              style={styles.cardBtn}
            />
          </CustomerCard>

          <CustomerCard style={styles.funnelCard} contentStyle={styles.funnelCardContent}>
            <View style={[styles.cardIconWrap, styles.agentIconWrap]}>
              <MaterialCommunityIcons name="headset" size={28} color={theme.colors.onSurface} />
            </View>
            <Text style={styles.cardTitle}>Live Support</Text>
            <Text style={styles.cardSub}>
              Need human assistance? Connect with our technical support team for complex issues.
            </Text>
            <CustomerButton
              label="Chat with Agent"
              variant="outline"
              icon="account"
              onPress={() => navigation.navigate('CustomerLiveChat')}
              style={styles.cardBtn}
            />
          </CustomerCard>

          <GlassCard style={styles.faqCard} padded contentStyle={styles.faqCardContent}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
              {publishedFaqs?.length ? (
                <Pressable onPress={() => navigation.navigate('CustomerFaqList')} accessibilityRole="link">
                  <Text style={styles.faqBrowseLink}>Browse all</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={theme.colors.onSurfaceVariant}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search FAQs..."
                placeholderTextColor={theme.colors.textMuted}
                value={search}
                onChangeText={setSearch}
                accessibilityLabel="Search FAQs"
              />
            </View>
            {faqsLoading ? (
              <CustomerSkeletonLoader rows={3} rowHeight={52} />
            ) : filteredFaqs.length === 0 ? (
              <CustomerEmptyState
                title="No matching FAQs"
                subtitle="Try a different search or raise a ticket below"
                icon="❓"
              />
            ) : (
              filteredFaqs.map((faq) => {
                const expanded = expandedId === faq.id;
                return (
                  <View key={faq.id} style={styles.faqItem}>
                    <Pressable
                      style={styles.faqQuestion}
                      onPress={() => setExpandedId(expanded ? null : faq.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      accessibilityLabel={faq.question}
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
              })
            )}
          </GlassCard>

          <View style={styles.ticketsSection}>
            <Text style={styles.ticketsHeading}>Tickets</Text>
            <CustomerCard
              onPress={() => navigation.navigate('CustomerTicketList')}
              accessibilityLabel="View my tickets"
              contentStyle={styles.ticketLinkContent}
            >
              <View style={styles.ticketLinkRow}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color={theme.colors.primary} />
                <View style={styles.ticketLinkTextWrap}>
                  <Text style={styles.ticketLinkTitle}>View my tickets</Text>
                  <Text style={styles.ticketLinkSub}>Track open and past support requests</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
              </View>
            </CustomerCard>
            <CustomerCard glow contentStyle={styles.raiseCardContent}>
              <Text style={styles.raiseTitle}>Didn&apos;t find your answer?</Text>
              <Text style={styles.raiseSub}>Raise a ticket and our team will follow up.</Text>
              <CustomerButton
                label="Raise a Ticket"
                icon="plus-circle-outline"
                onPress={() => navigation.navigate('CreateCustomerTicket')}
                style={styles.cardBtn}
              />
            </CustomerCard>
          </View>
        </View>
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
    funnel: { gap: theme.spacing.md },
    funnelCard: { borderRadius: theme.radius.lg },
    funnelCardContent: { gap: theme.spacing.sm },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaIconWrap: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    agentIconWrap: {
      backgroundColor: theme.colors.bgGlass,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    cardTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    cardSub: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    unavailableBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: 'rgba(245,158,11,0.12)',
    },
    unavailableText: {
      ...theme.typography.caption,
      color: theme.colors.accentWarning,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
    cardBtn: { width: '100%', marginTop: theme.spacing.xs },
    faqCard: { borderRadius: theme.radius.lg },
    faqCardContent: { gap: theme.spacing.sm },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      flex: 1,
    },
    faqBrowseLink: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
    },
    searchWrap: {
      position: 'relative',
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
      overflow: 'hidden',
      backgroundColor: theme.colors.bgGlass,
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
    ticketsSection: { gap: theme.spacing.sm },
    ticketsHeading: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    ticketLinkContent: { gap: 0 },
    ticketLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    ticketLinkTextWrap: { flex: 1, gap: 2 },
    ticketLinkTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    ticketLinkSub: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    raiseCardContent: { gap: theme.spacing.sm },
    raiseTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    raiseSub: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
  });
