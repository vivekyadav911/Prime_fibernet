import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type Props = BottomTabScreenProps<CustomerTabParamList, 'Support'>;

const OPTIONS = [
  { title: 'AI Assistant', subtitle: 'Instant answers from our knowledge base', route: 'SupportScreen' as const, icon: '🤖' },
  { title: 'Talk to Agent', subtitle: 'Chat with a support agent in real time', route: 'CustomerLiveChat' as const, icon: '💬' },
  { title: 'Browse FAQs', subtitle: 'Find answers to common questions', route: 'CustomerFaqList' as const, icon: '📋' },
];

export function CustomerSupportHubScreen({}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  return (
    <Screen style={styles.screen}>
      <Text style={styles.heading}>How can we help?</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.route}
            style={styles.card}
            onPress={() => navigation.navigate(opt.route)}
          >
            <Text style={styles.icon}>{opt.icon}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{opt.title}</Text>
              <Text style={styles.cardSub}>{opt.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  heading: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  icon: { fontSize: 32 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, flexShrink: 1 },
});
