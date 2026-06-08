import { z } from 'zod';

import { dateSchema, timestamptzSchema, uuidSchema } from './common';

export const SubscriptionStatusSchema = z.enum(['active', 'expired', 'cancelled']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

/**
 * Row shape for `public.subscriptions`.
 * @see prime_fibernet_app/lib/services/supabase_service.dart `fetchActiveSubscription`
 * @see supabase/migrations/20260607000000_initial_schema.sql
 */
export const SubscriptionSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  plan_id: uuidSchema.nullable().optional(),
  start_at: dateSchema.or(timestamptzSchema),
  end_at: dateSchema.or(timestamptzSchema).nullable().optional(),
  status: SubscriptionStatusSchema.default('active'),
  created_at: timestamptzSchema.nullable().optional(),
  updated_at: timestamptzSchema.nullable().optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const parseSubscription = (data: unknown): Subscription =>
  SubscriptionSchema.parse(data);
