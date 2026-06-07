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

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  speedMbps: z.number(),
  price: z.number(),
  validityDays: z.number(),
  features: z.array(z.string()),
  isActive: z.boolean(),
});

export type Plan = z.infer<typeof PlanSchema>;

export const ServiceRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  officerId: z.string().uuid().nullable(),
  requestType: RequestTypeSchema,
  status: RequestStatusSchema,
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  address: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number(),
  paymentStatus: z.enum(['success', 'failed', 'refunded']),
  transactionId: z.string().nullable(),
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
