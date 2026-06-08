import { z } from 'zod';

import { entityIdSchema, timestamptzSchema, uuidSchema } from './common';

export const RequestTypeSchema = z.enum(['installation', 'repair', 'upgrade', 'complaint']);
export type RequestType = z.infer<typeof RequestTypeSchema>;

/**
 * Status values persisted in `service_requests.status` (Flutter admin `_convertDbRequestToModel`).
 */
export const RequestStatusSchema = z.enum([
  'pending',
  'assigned',
  'in_progress',
  'awaiting_customer',
  'completed',
  'cancelled',
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const RequestPrioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);
export type RequestPriority = z.infer<typeof RequestPrioritySchema>;

/**
 * Row shape for `public.request_activities`.
 * @see prime_fibernet_admin_panel/lib/models/service_request.dart `RequestActivity`
 * @see supabase/migrations/20260607000000_initial_schema.sql
 */
export const RequestActivitySchema = z.object({
  id: uuidSchema,
  request_id: uuidSchema,
  officer_id: uuidSchema.nullable().optional(),
  action: z.string().nullable().optional(),
  actor_name: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  photo_urls: z.array(z.string()).default([]),
  timestamp: timestamptzSchema.nullable().optional(),
  created_at: timestamptzSchema.nullable().optional(),
  updated_at: timestamptzSchema.nullable().optional(),
});

export type RequestActivity = z.infer<typeof RequestActivitySchema>;

/**
 * Row shape for `public.service_requests`.
 * @see prime_fibernet_admin_panel/lib/models/service_request.dart
 * @see supabase/migrations/20260607000000_initial_schema.sql
 * @see supabase/migrations/20260607100000_enterprise_legacy_alter_core.sql
 */
export const ServiceRequestSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable().optional(),
  officer_id: entityIdSchema.nullable().optional(),
  request_type: RequestTypeSchema.nullable().optional(),
  type: z.string().nullable().optional(),
  status: RequestStatusSchema.default('pending'),
  priority: RequestPrioritySchema.default('P2'),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  is_escalated: z.boolean().default(false),
  user_name: z.string().nullable().optional(),
  user_email: z.string().nullable().optional(),
  user_phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  notes: z.string().default(''),
  plan_id: uuidSchema.nullable().optional(),
  officer_name: z.string().nullable().optional(),
  scheduled_at: timestamptzSchema.nullable().optional(),
  completed_at: timestamptzSchema.nullable().optional(),
  ticket_type: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  sub_category: z.string().nullable().optional(),
  location_lat: z.number().nullable().optional(),
  location_lng: z.number().nullable().optional(),
  location_address: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  created_by_admin_id: uuidSchema.nullable().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema.nullable().optional(),
  activities: z.array(RequestActivitySchema).optional(),
});

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const parseServiceRequest = (data: unknown): ServiceRequest =>
  ServiceRequestSchema.parse(data);

export const parseRequestActivity = (data: unknown): RequestActivity =>
  RequestActivitySchema.parse(data);
