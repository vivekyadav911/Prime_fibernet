import { z } from 'zod';

import { dateSchema, uuidSchema } from '@/types/common';

export const AdminCreateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, and _.-'),
  planId: uuidSchema,
  status: z.enum(['active', 'inactive']),
  address: z.string().min(5, 'Full address is required'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  state: z.string().min(1, 'State is required'),
  expiryDate: dateSchema.refine(
    (d) => new Date(d) > new Date(),
    'Expiry date must be in the future',
  ),
});

export type AdminCreateUserFormData = z.infer<typeof AdminCreateUserSchema>;
