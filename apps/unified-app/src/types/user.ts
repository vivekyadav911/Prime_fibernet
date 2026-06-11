import { z } from 'zod';

import { dateSchema, entityIdSchema, timestamptzSchema, uuidSchema } from './common';
import { PlanSchema } from './plan';
import { SubscriptionSchema } from './subscription';

export const UserRoleSchema = z.enum(['customer', 'officer', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const NotificationPrefsSchema = z.record(z.string(), z.unknown());
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

/**
 * Row shape for `public.users` (initial schema + enterprise legacy columns).
 * @see supabase/migrations/20260607000000_initial_schema.sql
 * @see supabase/migrations/20260607100000_enterprise_legacy_alter_core.sql
 */
export const UserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  name: z.string().min(1),
  role: UserRoleSchema.default('customer'),
  is_blocked: z.boolean().default(false),
  notification_prefs: NotificationPrefsSchema.default({}),
  created_at: timestamptzSchema,
  auth_user_id: uuidSchema.nullable().optional(),
  legacy_user_id: z.number().int().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  middle_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  owner_id: uuidSchema.nullable().optional(),
  current_latitude: z.number().nullable().optional(),
  current_longitude: z.number().nullable().optional(),
  last_location_update: timestamptzSchema.nullable().optional(),
  last_renewal_date: timestamptzSchema.nullable().optional(),
  expiry_date: timestamptzSchema.nullable().optional(),
  block_reason: z.string().nullable().optional(),
  block_updated_at: timestamptzSchema.nullable().optional(),
  updated_at: timestamptzSchema.nullable().optional(),
  invoice_delivery_preference: z.string().nullable().optional(),
  requires_gst_invoice: z.boolean().default(false),
  profile_picture_url: z.string().nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Customer profile with optional active subscription + plan (joined in app layer).
 * Maps Flutter `UserProfile` + subscription fetch from `subscriptions` + `plans`.
 */
export const UserProfileSchema = UserSchema.extend({
  subscription: SubscriptionSchema.nullable().optional(),
  plan: PlanSchema.nullable().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const parseUser = (data: unknown): User => UserSchema.parse(data);
export const parseUserProfile = (data: unknown): UserProfile => UserProfileSchema.parse(data);
