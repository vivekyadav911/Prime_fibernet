import { z } from 'zod';

export const collectionStatusSchema = z.enum([
  'inactive',
  'open',
  'assigned',
  'claimed',
  'collected',
  'failed',
]);

export const officerCollectionMethodSchema = z.enum(['cash', 'card', 'upi']);

export const officerCollectionFormSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((v) => {
        const n = Number(v.replace(/,/g, ''));
        return Number.isFinite(n) && n > 0;
      }, 'Enter a valid amount'),
    method: officerCollectionMethodSchema,
    paymentReference: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'card') {
      const last4 = (data.paymentReference ?? '').trim();
      if (!/^\d{4}$/.test(last4)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter last 4 digits of the card',
          path: ['paymentReference'],
        });
      }
    }
    if (data.method === 'upi') {
      const ref = (data.paymentReference ?? '').trim();
      if (ref.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter UPI transaction reference',
          path: ['paymentReference'],
        });
      }
    }
  });

export type OfficerCollectionFormValues = z.infer<typeof officerCollectionFormSchema>;
