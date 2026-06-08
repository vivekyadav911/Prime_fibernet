import { z } from 'zod';

import { dateSchema, entityIdSchema, timestamptzSchema, uuidSchema } from './common';

export const PaymentMethodSchema = z.enum([
  'cash',
  'upi',
  'credit_card',
  'debit_card',
  'net_banking',
  'wallet',
  'easybuzz',
  'razorpay',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * `user_payments.payment_status` — phase-2 constraint uses `success` (not `completed`).
 * @see supabase/migrations/20260607200000_phase2_foundation.sql
 */
export const PaymentStatusSchema = z.enum(['pending', 'success', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

/**
 * Row shape for `public.user_payments`.
 * @see prime_fibernet_app/lib/models/payment.dart `UserPayment.fromJson`
 * @see supabase/migrations/20260607000000_initial_schema.sql
 */
export const PaymentSchema = z.object({
  id: uuidSchema,
  user_id: entityIdSchema,
  user_name: z.string(),
  user_email: z.string().nullable().optional(),
  user_phone: z.string().nullable().optional(),
  amount: z.number(),
  payment_method: PaymentMethodSchema,
  payment_status: PaymentStatusSchema,
  transaction_id: z.string().nullable().optional(),
  refund_amount: z.number().nullable().optional(),
  currency: z.string().default('INR'),
  collected_by_officer_id: entityIdSchema.nullable().optional(),
  collected_by_officer_name: z.string().nullable().optional(),
  collection_location: z.string().nullable().optional(),
  collection_timestamp: timestamptzSchema.nullable().optional(),
  upi_transaction_id: z.string().nullable().optional(),
  upi_reference_id: z.string().nullable().optional(),
  payment_gateway: z.string().nullable().optional(),
  gateway: z.string().nullable().optional(),
  gateway_transaction_id: z.string().nullable().optional(),
  invoice_id: uuidSchema.nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  invoice_url: z.string().nullable().optional(),
  plan_id: uuidSchema.nullable().optional(),
  plan_name: z.string().nullable().optional(),
  plan_price: z.number().nullable().optional(),
  billing_period_start: dateSchema.nullable().optional(),
  billing_period_end: dateSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema.nullable().optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const parsePayment = (data: unknown): Payment => PaymentSchema.parse(data);
