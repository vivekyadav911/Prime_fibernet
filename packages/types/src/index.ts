import { z } from 'zod';

export const AppRoleSchema = z.enum(['customer', 'officer', 'admin']);
export type AppRole = z.infer<typeof AppRoleSchema>;

export const AppEnvSchema = z.enum(['development', 'staging', 'production']);
export type AppEnv = z.infer<typeof AppEnvSchema>;

export const EnvConfigSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  appEnv: AppEnvSchema,
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must include uppercase')
  .regex(/[a-z]/, 'Must include lowercase')
  .regex(/[0-9]/, 'Must include digit')
  .regex(/[!@#$%^&*]/, 'Must include special character');

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
});

export const SignUpSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

export const RequestTypeSchema = z.enum(['installation', 'repair', 'upgrade', 'complaint']);
export type RequestType = z.infer<typeof RequestTypeSchema>;

export const RequestStatusSchema = z.enum([
  'pending',
  'assigned',
  'in_transit',
  'on_site',
  'working',
  'resolved',
  'cancelled',
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const BillingCycleSchema = z.enum(['monthly', 'quarterly', 'annual']);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  speedMbps: z.number(),
  price: z.number(),
  priceQuarterly: z.number().nullable().optional(),
  priceAnnual: z.number().nullable().optional(),
  validityDays: z.number(),
  features: z.array(z.string()),
  isActive: z.boolean(),
  isFeatured: z.boolean().optional(),
  isUnlimited: z.boolean().optional(),
  dataLimitGb: z.number().nullable().optional(),
  routerType: z.string().nullable().optional(),
  hasStaticIp: z.boolean().optional(),
  includesOtt: z.boolean().optional(),
});

export type Plan = z.infer<typeof PlanSchema>;

export const ServiceRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  officerId: z.string().uuid().nullable(),
  requestType: RequestTypeSchema,
  requestTypeLabel: z.string().optional(),
  status: RequestStatusSchema,
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  address: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
});

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number(),
  paymentStatus: z.enum(['pending', 'success', 'failed', 'refunded']),
  transactionId: z.string().nullable(),
  invoiceUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  role: AppRoleSchema,
  isBlocked: z.boolean(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PaymentGatewaySchema = z.enum(['razorpay', 'easybuzz']);
export type PaymentGateway = z.infer<typeof PaymentGatewaySchema>;

export const PaymentStatusSchema = z.enum(['pending', 'success', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const SubscriptionStatusSchema = z.enum([
  'active',
  'expired',
  'cancelled',
  'suspended',
  'pending',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  planName: z.string().optional(),
  speedMbps: z.number().optional(),
  amountPaid: z.number().optional(),
  billingCycle: BillingCycleSchema.nullable().optional(),
  autoRenew: z.boolean().optional(),
  startAt: z.string(),
  endAt: z.string(),
  status: SubscriptionStatusSchema,
  daysUntilExpiry: z.number().optional(),
  isExpiringSoon: z.boolean().optional(),
  isOverdue: z.boolean().optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  officerId: z.string().uuid(),
  shiftDate: z.string(),
  status: z.string(),
  checkInTime: z.string().nullable(),
  checkOutTime: z.string().nullable(),
});

export type Shift = z.infer<typeof ShiftSchema>;

export const LeaveRequestSchema = z.object({
  id: z.string().uuid(),
  officerId: z.string().uuid(),
  leaveType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: z.string(),
});

export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const PayslipSchema = z.object({
  id: z.string().uuid(),
  officerId: z.string().uuid(),
  month: z.string(),
  base: z.number(),
  bonuses: z.number(),
  deductions: z.number(),
  netPay: z.number(),
  pdfUrl: z.string().nullable(),
});

export type Payslip = z.infer<typeof PayslipSchema>;

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string().nullable(),
  category: z.string().nullable(),
  quantity: z.number(),
  status: z.string(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const OfficerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string(),
  region: z.string().nullable(),
  availabilityStatus: z.string(),
});

export type Officer = z.infer<typeof OfficerSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  actorId: z.string().uuid().nullable(),
  action: z.string(),
  targetEntity: z.string().nullable(),
  status: z.string().nullable(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const RequestActivitySchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export type RequestActivity = z.infer<typeof RequestActivitySchema>;

export const PaymentOrderResponseSchema = z.object({
  paymentId: z.string(),
  orderId: z.string(),
  checkoutUrl: z.string().nullable(),
  gateway: PaymentGatewaySchema,
  amount: z.number(),
});

export type PaymentOrderResponse = z.infer<typeof PaymentOrderResponseSchema>;

export const CompanySettingsSchema = z.object({
  companyName: z.string().nullable(),
  companyEmail: z.string().nullable(),
  paymentGateway: PaymentGatewaySchema.optional(),
});

export type CompanySettings = z.infer<typeof CompanySettingsSchema>;

/**
 * Seeded development credentials for the dev-only "Login as <role>" buttons.
 * These map to REAL Supabase auth users created by scripts/seed-dev-users.mjs.
 * The buttons perform an actual sign-in — there is no mock/fake session.
 */
export const DEV_AUTH_CREDENTIALS = {
  customer: { email: 'dev-customer@prime.local', password: 'DevPassword123!' },
  officer: { email: 'dev-officer@prime.local', password: 'DevPassword123!' },
  admin: { email: 'dev-admin@prime.local', password: 'DevPassword123!' },
} as const;
