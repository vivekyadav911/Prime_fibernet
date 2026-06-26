import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { z } from 'zod';

import { CustomerButton, CustomerInput } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { DismissKeyboardScrollView } from '@/components/common';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useCreateCustomerTicketMutation } from '@/services/api/customerTicketsApi';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CreateCustomerTicket'>;

const schema = z.object({
  subject: z.string().min(3, 'Subject is required'),
  description: z.string().min(20, 'Please provide at least 20 characters'),
});

const CATEGORIES = [
  { id: 'speed_issue', label: 'Speed Issue' },
  { id: 'billing', label: 'Billing' },
  { id: 'plan_change', label: 'Plan Change' },
  { id: 'outage', label: 'Outage' },
  { id: 'technical', label: 'Technical' },
  { id: 'installation', label: 'Installation' },
  { id: 'other', label: 'Other' },
] as const;

function CreateTicketContent({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('technical');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [createTicket, { isLoading }] = useCreateCustomerTicketMutation();

  const priority =
    category === 'outage' || category === 'speed_issue'
      ? 'High'
      : category === 'billing'
        ? 'Medium'
        : 'Medium';

  const onSubmit = async () => {
    const parsed = schema.safeParse({ subject, description });
    if (!parsed.success) {
      const fieldErrors: { subject?: string; description?: string } = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key === 'subject' || key === 'description') fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    try {
      const ticket = await createTicket({
        category,
        subject,
        description,
        priority,
      }).unwrap();
      Alert.alert('Ticket raised', `Your ticket ${ticket.ticketNumber} has been submitted.`);
      navigation.replace('CustomerTicketDetail', { ticketId: ticket.id });
    } catch (e) {
      Alert.alert('Could not create ticket', e instanceof Error ? e.message : 'Try again in a moment.');
    }
  };

  return (
    <DismissKeyboardScrollView style={styles.canvas} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Raise a ticket</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((c) => (
          <CustomerButton
            key={c.id}
            label={c.label}
            variant={category === c.id ? 'primary' : 'ghost'}
            onPress={() => setCategory(c.id)}
            style={styles.catBtn}
          />
        ))}
      </View>
      <CustomerInput label="Subject" value={subject} onChangeText={setSubject} error={errors.subject} />
      <CustomerInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
        numberOfLines={5}
        style={styles.textarea}
      />
      <CustomerButton
        label={isLoading ? 'Submitting…' : 'Raise Ticket'}
        onPress={() => void onSubmit()}
        disabled={isLoading}
      />
    </DismissKeyboardScrollView>
  );
}

export function CreateCustomerTicketScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <CreateTicketContent {...props} />
    </CustomerFontProvider>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 22,
      fontWeight: '700',
    },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    catBtn: { paddingHorizontal: theme.spacing.sm },
    textarea: { minHeight: 120, textAlignVertical: 'top' },
  });
