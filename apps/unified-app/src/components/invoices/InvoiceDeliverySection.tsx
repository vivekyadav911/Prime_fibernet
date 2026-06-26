import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FilterChips, FormField, SectionCard } from '@/components/admin';
import { SelectCustomerModal } from '@/components/TicketPortal/SelectCustomerModal';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminUserListItem } from '@/types/api/admin';
import type { InvoiceDeliveryChannel } from '@/types/invoice';

type InvoiceDeliverySectionProps = {
  channel: InvoiceDeliveryChannel;
  onChannelChange: (channel: 'email' | 'whatsapp') => void;
  recipientEmail: string;
  recipientPhone: string;
  onRecipientEmailChange: (v: string) => void;
  onRecipientPhoneChange: (v: string) => void;
  emailError?: string;
  phoneError?: string;
  selectedRecipientCustomer?: AdminUserListItem | null;
  onRecipientCustomerChange?: (customer: AdminUserListItem | null) => void;
};

export function InvoiceDeliverySection({
  channel,
  onChannelChange,
  recipientEmail,
  recipientPhone,
  onRecipientEmailChange,
  onRecipientPhoneChange,
  emailError,
  phoneError,
  selectedRecipientCustomer,
  onRecipientCustomerChange,
}: InvoiceDeliverySectionProps) {
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);

  const handleCustomerSelect = useCallback(
    (customer: AdminUserListItem | null) => {
      onRecipientCustomerChange?.(customer);
      if (customer) {
        onRecipientEmailChange(customer.email);
        onRecipientPhoneChange(customer.phone ?? '');
      }
    },
    [onRecipientCustomerChange, onRecipientEmailChange, onRecipientPhoneChange],
  );

  return (
    <SectionCard title="Delivery">
      <FilterChips
        options={[
          { value: 'email', label: 'Email' },
          { value: 'whatsapp', label: 'WhatsApp' },
        ]}
        selected={channel === 'manual' ? 'email' : channel}
        onSelect={onChannelChange}
      />

      {onRecipientCustomerChange ? (
        <>
          <Pressable style={styles.pickBtn} onPress={() => setCustomerPickerVisible(true)}>
            <Text style={styles.pickBtnLabel}>
              {selectedRecipientCustomer
                ? `Recipient: ${selectedRecipientCustomer.name}`
                : 'Select customer from list'}
            </Text>
            <Text style={styles.pickBtnHint}>Auto-fills email and phone from customer profile</Text>
          </Pressable>
          {selectedRecipientCustomer ? (
            <Pressable onPress={() => handleCustomerSelect(null)}>
              <Text style={styles.clearLink}>Clear recipient selection</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {channel === 'email' || channel === 'manual' ? (
        <>
          <FormField
            label="Recipient email"
            value={recipientEmail}
            onChangeText={onRecipientEmailChange}
            placeholder="recipient@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
          />
          <Text style={styles.hint}>Select a customer above or enter any email manually.</Text>
        </>
      ) : (
        <>
          <FormField
            label="Recipient phone"
            value={recipientPhone}
            onChangeText={onRecipientPhoneChange}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            error={phoneError}
          />
          <Text style={styles.hint}>
            Select a customer above or enter a phone number. If WhatsApp is not configured, download
            the PDF and share from your device.
          </Text>
        </>
      )}

      <SelectCustomerModal
        visible={customerPickerVisible}
        selectedCustomerId={selectedRecipientCustomer?.id ?? null}
        onClose={() => setCustomerPickerVisible(false)}
        onSelect={handleCustomerSelect}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  pickBtn: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  pickBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: adminColors.primary,
  },
  pickBtnHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  clearLink: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.primary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
