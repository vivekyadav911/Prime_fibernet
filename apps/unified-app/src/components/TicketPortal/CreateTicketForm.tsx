import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@prime/ui';

import { FilterChips, FormField, FormRow, SelectField } from '@/components/admin';
import { fetchOfficers } from '@/services/ticketsService';
import { adminUsersApi } from '@/services/api/adminUsersApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminUserListItem } from '@/types/api/admin';
import type { Officer } from '@/types/requests';
import type { ComplaintType, TicketPriority, TicketSource } from '@/types/tickets';
import {
  COMPLAINT_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  SOURCE_OPTIONS,
  useTicketForm,
} from '@/hooks/useTicketForm';
import { truncateRequestId } from '@/utils/requestViewMappers';

import { LinkRequestModal } from './LinkRequestModal';
import { SelectCustomerModal } from './SelectCustomerModal';

type ContactMode = 'existing' | 'new';

type CreateTicketFormProps = {
  linkedRequestId?: string;
  linkedRequestNumber?: string;
  initialCustomerId?: string;
  onCreated?: () => void;
};

const CONTACT_MODE_OPTIONS: { value: ContactMode; label: string }[] = [
  { value: 'existing', label: 'Existing Customer' },
  { value: 'new', label: 'New Contact' },
];

export function CreateTicketForm({
  linkedRequestId,
  linkedRequestNumber,
  initialCustomerId,
  onCreated,
}: CreateTicketFormProps) {
  const {
    formData,
    errors,
    updateField,
    submitTicket,
    isSubmitting,
    setLinkedRequest,
    addTag,
    removeTag,
    autoFillFromCustomer,
    clearCustomer,
  } = useTicketForm(
    linkedRequestId
      ? { linkedRequestId, linkedRequestNumber: linkedRequestNumber ?? linkedRequestId }
      : undefined,
  );

  const [fetchCustomerDetail] = adminUsersApi.useLazyGetAdminUserDetailQuery();

  const [contactMode, setContactMode] = useState<ContactMode>(initialCustomerId ? 'existing' : 'new');
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const [officers, setOfficers] = useState<Officer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officersError, setOfficersError] = useState<string | null>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const applyCustomer = useCallback(
    async (customer: AdminUserListItem | null) => {
      if (!customer) {
        clearCustomer();
        setSelectedCustomerLabel(null);
        setCustomerError(null);
        return;
      }

      setLoadingCustomer(true);
      setCustomerError(null);
      try {
        const detail = await fetchCustomerDetail(customer.id).unwrap();
        autoFillFromCustomer({
          id: detail.id,
          name: detail.name,
          email: detail.email,
          phone: detail.phone,
          address: detail.address,
          city: detail.city,
          accountNumber: detail.accountNumber,
        });
        setSelectedCustomerLabel(customer.name);
      } catch {
        autoFillFromCustomer({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          city: customer.city,
        });
        setSelectedCustomerLabel(customer.name);
      } finally {
        setLoadingCustomer(false);
      }
    },
    [autoFillFromCustomer, clearCustomer, fetchCustomerDetail],
  );

  const loadOfficers = useCallback(async () => {
    setOfficersLoading(true);
    setOfficersError(null);
    try {
      setOfficers(await fetchOfficers());
    } catch {
      setOfficersError('Could not load officers. Tap to retry.');
    } finally {
      setOfficersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOfficers();
  }, [loadOfficers]);

  useEffect(() => {
    if (linkedRequestId) {
      setLinkedRequest(linkedRequestId, linkedRequestNumber ?? linkedRequestId);
    }
  }, [linkedRequestId, linkedRequestNumber, setLinkedRequest]);

  useEffect(() => {
    if (!initialCustomerId) return;
    void applyCustomer({
      id: initialCustomerId,
      legacyUserId: null,
      name: 'Customer',
      username: null,
      email: '',
      phone: null,
      city: null,
      planName: '',
      status: 'active',
      isBlocked: false,
    });
  }, [initialCustomerId, applyCustomer]);

  const handleContactModeChange = useCallback(
    (mode: ContactMode) => {
      setContactMode(mode);
      setCustomerError(null);
      if (mode === 'new') {
        clearCustomer();
        setSelectedCustomerLabel(null);
      }
    },
    [clearCustomer],
  );

  const handleSubmit = useCallback(async () => {
    if (contactMode === 'existing' && !formData.customerId) {
      setCustomerError('Select an existing customer to continue.');
      return;
    }
    setCustomerError(null);
    const ticket = await submitTicket();
    if (ticket) onCreated?.();
  }, [contactMode, formData.customerId, onCreated, submitTicket]);

  const handleTagSubmit = useCallback(() => {
    if (tagInput.includes(',')) {
      tagInput.split(',').forEach((t) => addTag(t));
    } else {
      addTag(tagInput);
    }
    setTagInput('');
  }, [addTag, tagInput]);

  const contactFieldsLocked = contactMode === 'existing' && Boolean(formData.customerId);

  const officerOptions: { value: string; label: string }[] = [
    { value: 'unassigned', label: '— Unassigned (pool)' },
    ...officers.map((o) => ({
      value: o.id,
      label: `${o.name} · ${o.area}`,
    })),
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Ticket</Text>
        <Text style={styles.badge}>NEW REQUEST</Text>
      </View>

      <Text style={styles.sectionLabel}>Customer Type</Text>
      <FilterChips
        options={CONTACT_MODE_OPTIONS}
        selected={contactMode}
        onSelect={handleContactModeChange}
      />

      {contactMode === 'existing' ? (
        <View style={styles.customerSection}>
          <Pressable style={styles.linkField} onPress={() => setCustomerModalVisible(true)}>
            <Text style={styles.fieldLabel}>SELECT CUSTOMER</Text>
            {loadingCustomer ? (
              <ActivityIndicator color={adminColors.primary} style={styles.customerLoader} />
            ) : (
              <Text style={styles.linkValue}>
                {selectedCustomerLabel ?? 'Tap to search and select a customer…'}
              </Text>
            )}
            {formData.accountNumber ? (
              <Text style={styles.accountMeta}>Account: {formData.accountNumber}</Text>
            ) : null}
          </Pressable>
          {customerError ? <Text style={styles.customerError}>{customerError}</Text> : null}
        </View>
      ) : null}

      <FormField
        label="Contact Name"
        value={formData.contactName}
        onChangeText={(v) => updateField('contactName', v)}
        error={errors.contactName}
        editable={!contactFieldsLocked}
      />

      <FormRow>
        <View style={styles.half}>
          <FormField
            label="Phone"
            value={formData.contactPhone}
            onChangeText={(v) => updateField('contactPhone', v)}
            keyboardType="phone-pad"
            error={errors.contactPhone}
            editable={!contactFieldsLocked}
          />
        </View>
        <View style={styles.half}>
          <FormField
            label="Email"
            value={formData.contactEmail}
            onChangeText={(v) => updateField('contactEmail', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.contactEmail}
            editable={!contactFieldsLocked}
          />
        </View>
      </FormRow>

      <FormRow>
        <View style={styles.wide}>
          <FormField
            label="Address"
            value={formData.address}
            onChangeText={(v) => updateField('address', v)}
            editable={!contactFieldsLocked}
          />
        </View>
        <View style={styles.narrow}>
          <FormField
            label="City"
            value={formData.city}
            onChangeText={(v) => updateField('city', v)}
            editable={!contactFieldsLocked}
          />
        </View>
      </FormRow>

      <SelectField<ComplaintType>
        label="Complaint Type"
        value={formData.complaintType}
        options={COMPLAINT_TYPE_OPTIONS.map((c) => ({ value: c, label: c }))}
        onSelect={(v) => updateField('complaintType', v)}
        error={errors.complaintType}
      />

      <SelectField<TicketPriority>
        label="Priority"
        value={formData.priority}
        options={PRIORITY_OPTIONS.map((p) => ({
          value: p,
          label: `● ${p}`,
        }))}
        onSelect={(v) => updateField('priority', v)}
        error={errors.priority}
      />

      <SelectField<TicketSource>
        label="Source"
        value={formData.source}
        options={SOURCE_OPTIONS}
        onSelect={(v) => updateField('source', v)}
      />

      {officersError ? (
        <Pressable onPress={loadOfficers}>
          <Text style={styles.officerError}>{officersError}</Text>
        </Pressable>
      ) : officersLoading ? (
        <ActivityIndicator color={adminColors.primary} />
      ) : (
        <SelectField
          label="Assign to Officer (optional)"
          value={formData.assignedOfficerId ?? 'unassigned'}
          options={officerOptions}
          onSelect={(v) => updateField('assignedOfficerId', v === 'unassigned' ? null : v)}
        />
      )}

      <FormField
        label="Description / Notes"
        value={formData.description}
        onChangeText={(v) => updateField('description', v)}
        multiline
        numberOfLines={4}
        error={errors.description}
        placeholder="Describe the issue in detail…"
      />

      <Text style={styles.fieldLabel}>TAGS (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        value={tagInput}
        onChangeText={setTagInput}
        onSubmitEditing={handleTagSubmit}
        placeholder="Add tag and press enter"
        placeholderTextColor={colors.textSecondary}
        returnKeyType="done"
        onBlur={handleTagSubmit}
      />
      {formData.tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
          {formData.tags.map((tag) => (
            <Pressable key={tag} style={styles.tag} onPress={() => removeTag(tag)}>
              <Text style={styles.tagText}>{tag} ×</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Pressable style={styles.linkField} onPress={() => setLinkModalVisible(true)}>
        <Text style={styles.fieldLabel}>LINK TO REQUEST (OPTIONAL)</Text>
        <Text style={styles.linkValue}>
          {formData.linkedRequestId
            ? truncateRequestId(formData.linkedRequestNumber ?? formData.linkedRequestId)
            : 'No request linked'}
        </Text>
      </Pressable>

      <Button
        label={isSubmitting ? 'Submitting…' : 'Submit Ticket'}
        onPress={handleSubmit}
        disabled={isSubmitting || loadingCustomer}
        style={styles.submitBtn}
      />

      <LinkRequestModal
        visible={linkModalVisible}
        linkedRequestId={formData.linkedRequestId}
        onClose={() => setLinkModalVisible(false)}
        onSelect={(request) => {
          setLinkedRequest(
            request?.id ?? null,
            request ? truncateRequestId(request.id) : null,
          );
        }}
      />

      <SelectCustomerModal
        visible={customerModalVisible}
        selectedCustomerId={formData.customerId}
        onClose={() => setCustomerModalVisible(false)}
        onSelect={(customer) => void applyCustomer(customer)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: -spacing.xxs,
  },
  customerSection: {
    gap: spacing.xxs,
  },
  half: { flex: 1 },
  wide: { flex: 7 },
  narrow: { flex: 3 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  tag: {
    backgroundColor: `${adminColors.primary}18`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginRight: spacing.xs,
  },
  tagText: {
    fontSize: 12,
    color: adminColors.primary,
    fontWeight: '600',
  },
  linkField: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  linkValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  accountMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  customerLoader: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  customerError: {
    color: colors.errorRed,
    fontSize: 12,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  officerError: {
    color: colors.errorRed,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
});
