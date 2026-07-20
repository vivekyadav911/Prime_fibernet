import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@prime/ui';

import { FilterChips, FormField } from '@/components/admin';
import { SelectCustomerModal } from '@/components/TicketPortal/SelectCustomerModal';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminUserListItem } from '@/types/api/admin';

export type SendInvoiceRecipientPayload = {
  channel: 'email' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
  customerId?: string | null;
};

type SendInvoiceRecipientModalProps = {
  visible: boolean;
  invoiceNumber: string;
  customerName: string;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  initialChannel?: 'email' | 'whatsapp';
  sending?: boolean;
  onClose: () => void;
  onSend: (payload: SendInvoiceRecipientPayload) => void;
};

export function SendInvoiceRecipientModal({
  visible,
  invoiceNumber,
  customerName,
  defaultEmail,
  defaultPhone,
  initialChannel = 'email',
  sending,
  onClose,
  onSend,
}: SendInvoiceRecipientModalProps) {
  const insets = useSafeAreaInsets();
  const windowDims = useWindowDimensions();
  const [channel, setChannel] = useState<'email' | 'whatsapp'>(initialChannel);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminUserListItem | null>(null);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setChannel(initialChannel);
    setRecipientEmail(defaultEmail?.trim() ?? '');
    setRecipientPhone(defaultPhone?.trim() ?? '');
    setSelectedCustomer(null);
    setEmailError(undefined);
    setPhoneError(undefined);
  }, [visible, initialChannel, defaultEmail, defaultPhone]);

  const handleCustomerSelect = useCallback((customer: AdminUserListItem | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setRecipientEmail(customer.email);
      setRecipientPhone(customer.phone ?? '');
      setEmailError(undefined);
      setPhoneError(undefined);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (channel === 'email') {
      const email = recipientEmail.trim();
      if (!email) {
        setEmailError('Enter an email or select a customer');
        return;
      }
      setEmailError(undefined);
      onSend({
        channel: 'email',
        recipientEmail: email,
        customerId: selectedCustomer?.id ?? null,
      });
      return;
    }
    const phone = recipientPhone.trim();
    if (!phone) {
      setPhoneError('Enter a phone number or select a customer');
      return;
    }
    setPhoneError(undefined);
    onSend({
      channel: 'whatsapp',
      recipientPhone: phone,
      customerId: selectedCustomer?.id ?? null,
    });
  }, [channel, onSend, recipientEmail, recipientPhone, selectedCustomer?.id]);

  const dialogMaxHeight = Math.min(windowDims.height * 0.85, windowDims.height - insets.top - insets.bottom - spacing.xl);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.avoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={[
              styles.backdrop,
              { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md },
            ]}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          >
            <Pressable
              style={[styles.card, { maxHeight: dialogMaxHeight }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Send invoice</Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  disabled={sending}
                  style={styles.closeBtn}
                >
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.body}
              >
                <Text style={styles.meta}>
                  {invoiceNumber} · {customerName}
                </Text>

                <FilterChips
                  options={[
                    { value: 'email', label: 'Email' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                  ]}
                  selected={channel}
                  onSelect={setChannel}
                />

                <Pressable
                  style={styles.pickBtn}
                  onPress={() => setCustomerPickerVisible(true)}
                  disabled={sending}
                >
                  <Text style={styles.pickBtnLabel}>
                    {selectedCustomer
                      ? `Selected: ${selectedCustomer.name}`
                      : 'Select customer from list'}
                  </Text>
                  <Text style={styles.pickBtnHint}>Auto-fills email and phone from profile</Text>
                </Pressable>

                {selectedCustomer ? (
                  <Pressable onPress={() => handleCustomerSelect(null)} disabled={sending}>
                    <Text style={styles.clearLink}>Clear customer selection</Text>
                  </Pressable>
                ) : null}

                {channel === 'email' ? (
                  <>
                    <FormField
                      label="Recipient email"
                      value={recipientEmail}
                      onChangeText={(v) => {
                        setRecipientEmail(v);
                        setEmailError(undefined);
                      }}
                      placeholder="billing@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={emailError}
                    />
                    <Text style={styles.hint}>Or type a different email manually.</Text>
                  </>
                ) : (
                  <>
                    <FormField
                      label="Recipient phone"
                      value={recipientPhone}
                      onChangeText={(v) => {
                        setRecipientPhone(v);
                        setPhoneError(undefined);
                      }}
                      placeholder="+91 98765 43210"
                      keyboardType="phone-pad"
                      error={phoneError}
                    />
                    <Text style={styles.hint}>
                      If WhatsApp is not configured, download the PDF and share from your device.
                    </Text>
                  </>
                )}

                <View style={styles.actions}>
                  <Button label="Cancel" variant="secondary" onPress={onClose} disabled={sending} />
                  <Button
                    label={sending ? 'Sending…' : 'Send invoice'}
                    onPress={handleSend}
                    disabled={sending}
                  />
                </View>

                {sending ? (
                  <ActivityIndicator color={adminColors.primary} style={styles.sending} />
                ) : null}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <SelectCustomerModal
        visible={customerPickerVisible}
        selectedCustomerId={selectedCustomer?.id ?? null}
        onClose={() => setCustomerPickerVisible(false)}
        onSelect={handleCustomerSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: 420,
  },
  body: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pickBtn: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
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
  },
  hint: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sending: {
    marginTop: spacing.xs,
  },
});
