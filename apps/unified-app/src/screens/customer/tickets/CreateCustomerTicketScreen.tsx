import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { z } from 'zod';

import { CustomerButton, CustomerInput } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { DismissKeyboardScrollView } from '@/components/common';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useCreateCustomerTicketMutation } from '@/services/api/customerTicketsApi';
import { useAppSelector } from '@/store/hooks';
import { queryErrorMessage } from '@/utils/queryError';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList } from '@/types/navigation';

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

function defaultSubject(categoryLabel: string, customerName: string): string {
  return `${categoryLabel} reported by ${customerName}`;
}

function CreateTicketContent({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const user = useAppSelector((s) => s.auth.user);
  const customerName = user?.name ?? 'Customer';
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id'] | ''>('');
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [createTicket, { isLoading }] = useCreateCustomerTicketMutation();

  const categoryLabel = useMemo(
    () => CATEGORIES.find((c) => c.id === category)?.label ?? 'Support request',
    [category],
  );

  const priority =
    category === 'outage' || category === 'speed_issue'
      ? 'High'
      : category === 'billing'
        ? 'Medium'
        : 'Medium';

  const onSubmit = async () => {
    if (!category) {
      setCategoryError('Select a category');
      return;
    }
    setCategoryError(undefined);

    const resolvedSubject = subject.trim() || defaultSubject(categoryLabel, customerName);
    const parsed = schema.safeParse({ subject: resolvedSubject, description });
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
        subject: resolvedSubject,
        description,
        priority,
      }).unwrap();
      Alert.alert('Ticket raised', `Your ticket ${ticket.ticketNumber} has been submitted.`);
      navigation.replace('CustomerTicketDetail', { ticketId: ticket.id });
    } catch (e) {
      Alert.alert('Could not create ticket', queryErrorMessage(e, 'Try again in a moment.'));
    }
  };

  return (
    <DismissKeyboardScrollView style={styles.canvas} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Raise a ticket</Text>
      <Text style={styles.label}>Category</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((c) => (
          <CustomerButton
            key={c.id}
            label={c.label}
            variant={category === c.id ? 'primary' : 'ghost'}
            onPress={() => {
              setCategory(c.id);
              setCategoryError(undefined);
            }}
            style={styles.catBtn}
          />
        ))}
      </View>
      {categoryError ? <Text style={styles.error}>{categoryError}</Text> : null}
      <CustomerInput
        label="Subject (optional)"
        value={subject}
        onChangeText={setSubject}
        error={errors.subject}
        placeholder={category ? defaultSubject(categoryLabel, customerName) : 'Auto-generated from category'}
      />
      <CustomerInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
        numberOfLines={5}
        style={styles.textarea}
      />
      <Text style={styles.counter}>{description.length}/20 min characters</Text>
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
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
    },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    catBtn: { paddingHorizontal: theme.spacing.sm },
    textarea: { minHeight: 120, textAlignVertical: 'top' },
    counter: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.fonts.body,
      textAlign: 'right',
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.error,
      fontFamily: theme.fonts.body,
    },
  });
