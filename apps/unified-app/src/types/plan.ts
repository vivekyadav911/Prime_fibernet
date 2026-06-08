import { z } from 'zod';

import { timestamptzSchema, uuidSchema } from './common';

/**
 * App-level speed tier (UI grouping). Stored in `plans.category` when set.
 * Flutter infers category from validity when absent.
 */
export const SpeedTierSchema = z.enum(['basic', 'standard', 'premium', 'business']);
export type SpeedTier = z.infer<typeof SpeedTierSchema>;

/**
 * Row shape for `public.plans`.
 * @see prime_fibernet_app/lib/models/plan.dart `Plan.fromJson`
 * @see supabase/migrations/20260607000000_initial_schema.sql
 */
export const PlanSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  speed_mbps: z.number().int().nullable().optional(),
  speed: z.string().nullable().optional(),
  price: z.number(),
  validity_days: z.number().int().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  features: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  created_at: timestamptzSchema.nullable().optional(),
  updated_at: timestamptzSchema.nullable().optional(),
});

export type Plan = z.infer<typeof PlanSchema>;

export const parsePlan = (data: unknown): Plan => PlanSchema.parse(data);
