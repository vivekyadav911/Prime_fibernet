import { useCallback, useState } from 'react';
import { z } from 'zod';

import { createTicket } from '@/services/ticketsService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { ComplaintType, Ticket, TicketFormData, TicketPriority, TicketSource } from '@/types/tickets';

const phoneRegex = /^[+\d\s\-()]{7,15}$/;

const ticketFormSchema = z.object({
  contactName: z.string().trim().min(2, 'Name must be at least 2 characters'),
  contactPhone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number'),
  contactEmail: z
    .string()
    .trim()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
  address: z.string(),
  city: z.string(),
  complaintType: z.string().min(1, 'Select a complaint type'),
  priority: z.string().min(1, 'Select a priority'),
  assignedOfficerId: z.string().nullable(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  source: z.string(),
  linkedRequestId: z.string().nullable(),
  linkedRequestNumber: z.string().nullable(),
  customerId: z.string().nullable(),
  tags: z.array(z.string()),
});

const DEFAULT_FORM: TicketFormData = {
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  city: '',
  complaintType: 'Technical Issue',
  priority: 'Medium',
  assignedOfficerId: null,
  description: '',
  source: 'admin',
  linkedRequestId: null,
  linkedRequestNumber: null,
  customerId: null,
  tags: [],
  subCategory: null,
  accountNumber: null,
};

export function useTicketForm(initialLinkedRequest?: {
  linkedRequestId: string;
  linkedRequestNumber: string;
}) {
  const dispatch = useAppDispatch();
  const admin = useAppSelector((s) => s.auth.user);
  const [formData, setFormData] = useState<TicketFormData>({
    ...DEFAULT_FORM,
    linkedRequestId: initialLinkedRequest?.linkedRequestId ?? null,
    linkedRequestNumber: initialLinkedRequest?.linkedRequestNumber ?? null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TicketFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback(<K extends keyof TicketFormData>(key: K, value: TicketFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM);
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const result = ticketFormSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Partial<Record<keyof TicketFormData, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof TicketFormData;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }, [formData]);

  const submitTicket = useCallback(async (): Promise<Ticket | null> => {
    if (!validate()) return null;
    if (!admin?.id) {
      dispatch(
        enqueueToast({
          id: `ticket-auth-${Date.now()}`,
          type: 'error',
          message: 'You must be signed in to create tickets.',
        }),
      );
      return null;
    }

    setIsSubmitting(true);
    try {
      const ticket = await createTicket(formData, {
        id: admin.id,
        name: admin.name ?? 'Admin',
        role: admin.role ?? 'admin',
      });
      dispatch(
        enqueueToast({
          id: `ticket-created-${ticket.id}`,
          type: 'success',
          message: `Ticket created successfully — ${ticket.ticketNumber}`,
        }),
      );
      resetForm();
      return ticket;
    } catch (e) {
      dispatch(
        enqueueToast({
          id: `ticket-error-${Date.now()}`,
          type: 'error',
          message: e instanceof Error ? e.message : 'Failed to create ticket. Please try again.',
        }),
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [admin, dispatch, formData, resetForm, validate]);

  const autoFillFromCustomer = useCallback(
    (customer: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      accountNumber?: string | null;
    }) => {
      setFormData((prev) => ({
        ...prev,
        customerId: customer.id,
        contactName: customer.name,
        contactEmail: customer.email ?? '',
        contactPhone: customer.phone ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        accountNumber: customer.accountNumber ?? null,
      }));
      setErrors({});
    },
    [],
  );

  const clearCustomer = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      customerId: null,
      accountNumber: null,
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
    }));
    setErrors((prev) => ({ ...prev, customerId: undefined }));
  }, []);

  const setLinkedRequest = useCallback((requestId: string | null, requestNumber: string | null) => {
    setFormData((prev) => ({
      ...prev,
      linkedRequestId: requestId,
      linkedRequestNumber: requestNumber,
    }));
  }, []);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setFormData((prev) =>
      prev.tags.includes(trimmed) ? prev : { ...prev, tags: [...prev.tags, trimmed] },
    );
  }, []);

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }, []);

  return {
    formData,
    errors,
    updateField,
    submitTicket,
    resetForm,
    isSubmitting,
    autoFillFromCustomer,
    clearCustomer,
    setLinkedRequest,
    addTag,
    removeTag,
  };
}

export const COMPLAINT_TYPE_OPTIONS: ComplaintType[] = [
  'Technical Issue',
  'Billing Dispute',
  'New Connection',
  'Speed Issue',
  'No Internet',
  'Hardware Fault',
  'Relocation',
  'Plan Upgrade',
  'Plan Downgrade',
  'Disconnection Request',
  'Other',
];

export const PRIORITY_OPTIONS: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export const SOURCE_OPTIONS: { value: TicketSource; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone_call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'portal', label: 'Portal' },
];
