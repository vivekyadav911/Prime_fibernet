import { z } from 'zod';

import { dateSchema, entityIdSchema, timestamptzSchema, uuidSchema } from './common';

export const ShiftStatusSchema = z.enum([
  'scheduled',
  'pending',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
]);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const AssignmentTargetTypeSchema = z.enum([
  'customer',
  'installation',
  'officer',
  'warehouse',
]);
export type AssignmentTargetType = z.infer<typeof AssignmentTargetTypeSchema>;

export const AssignmentStatusSchema = z.enum(['active', 'returned', 'lost', 'damaged', 'assigned']);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const DeviceConditionSchema = z.enum(['good', 'fair', 'poor', 'damaged']);
export type DeviceCondition = z.infer<typeof DeviceConditionSchema>;

const geographyPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

/**
 * Row shape for `public.officers`.
 * @see prime_fibernet_admin_panel/lib/models/managed_officer.dart
 * @see supabase/migrations/20260607000000_initial_schema.sql
 */
export const OfficerSchema = z.object({
  id: entityIdSchema,
  user_id: uuidSchema.nullable().optional(),
  auth_user_id: uuidSchema.nullable().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  roles: z.union([z.array(z.string()), z.record(z.string(), z.unknown())]).nullable().optional(),
  role_id: uuidSchema.nullable().optional(),
  is_active: z.boolean().default(true),
  is_blocked: z.boolean().default(false),
  availability_status: z.string().default('available'),
  is_location_tracking_enabled: z.boolean().default(false),
  current_latitude: z.number().nullable().optional(),
  current_longitude: z.number().nullable().optional(),
  last_location_update: timestamptzSchema.nullable().optional(),
  last_active_at: timestamptzSchema.nullable().optional(),
  salary_config: z.record(z.string(), z.unknown()).default({}),
  password_hash: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  terminated_at: timestamptzSchema.nullable().optional(),
  termination_reason: z.string().nullable().optional(),
  joining_date: dateSchema.nullable().optional(),
  profile_photo_url: z.string().nullable().optional(),
  created_at: timestamptzSchema.nullable().optional(),
  updated_at: timestamptzSchema.nullable().optional(),
});

export type Officer = z.infer<typeof OfficerSchema>;

/**
 * Row shape for `public.shifts`.
 * @see supabase/migrations/20260607000000_initial_schema.sql
 * @see prime_fibernet_officer_app/lib/services/shift_service.dart (`shift_schedules` runtime fields included where used)
 */
export const ShiftSchema = z.object({
  id: uuidSchema,
  officer_id: entityIdSchema,
  shift_date: dateSchema,
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  status: ShiftStatusSchema.default('scheduled'),
  check_in_time: timestamptzSchema.nullable().optional(),
  check_out_time: timestamptzSchema.nullable().optional(),
  location: geographyPointSchema.nullable().optional(),
  required_location_id: uuidSchema.nullable().optional(),
  officer_notes: z.string().nullable().optional(),
  created_at: timestamptzSchema.nullable().optional(),
});

export type Shift = z.infer<typeof ShiftSchema>;

/**
 * Row shape for `public.inventory_assignments`.
 * @see prime_fibernet_admin_panel/lib/models/inventory_assignment.dart
 */
export const InventoryAssignmentSchema = z.object({
  id: uuidSchema,
  item_id: uuidSchema,
  quantity: z.number().int().default(1),
  assigned_to_type: AssignmentTargetTypeSchema,
  assigned_to_id: entityIdSchema,
  assigned_to_name: z.string().nullable().optional(),
  service_request_id: uuidSchema.nullable().optional(),
  subscription_id: uuidSchema.nullable().optional(),
  status: AssignmentStatusSchema.default('active'),
  assignment_date: timestamptzSchema,
  return_date: timestamptzSchema.nullable().optional(),
  expected_return_date: timestamptzSchema.nullable().optional(),
  serial_numbers: z.array(z.string()).nullable().optional(),
  device_condition: DeviceConditionSchema.default('good'),
  assigned_by: entityIdSchema,
  assigned_by_name: z.string().nullable().optional(),
  returned_by: entityIdSchema.nullable().optional(),
  returned_by_name: z.string().nullable().optional(),
  return_condition: DeviceConditionSchema.nullable().optional(),
  return_notes: z.string().nullable().optional(),
  installation_address: z.string().nullable().optional(),
  installation_location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: timestamptzSchema.nullable().optional(),
  updated_at: timestamptzSchema.nullable().optional(),
  item_name: z.string().nullable().optional(),
  item_sku: z.string().nullable().optional(),
  item_category: z.string().nullable().optional(),
});

export type InventoryAssignment = z.infer<typeof InventoryAssignmentSchema>;

export const parseOfficer = (data: unknown): Officer => OfficerSchema.parse(data);
export const parseShift = (data: unknown): Shift => ShiftSchema.parse(data);
export const parseInventoryAssignment = (data: unknown): InventoryAssignment =>
  InventoryAssignmentSchema.parse(data);
