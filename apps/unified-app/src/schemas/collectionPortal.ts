import { z } from 'zod';

export const collectionStatusSchema = z.enum([
  'inactive',
  'open',
  'assigned',
  'claimed',
  'collected',
  'failed',
]);

export const officerCollectionMethodSchema = z.enum(['cash', 'netbanking', 'upi']);

const denominationFieldSchema = z.coerce.number().int().min(0).default(0);

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
    denominations: z
      .object({
        '500': denominationFieldSchema,
        '200': denominationFieldSchema,
        '100': denominationFieldSchema,
        '50': denominationFieldSchema,
        '20': denominationFieldSchema,
        '10': denominationFieldSchema,
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'netbanking') {
      const ref = (data.paymentReference ?? '').trim();
      if (ref.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter bank reference / UTR number',
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
