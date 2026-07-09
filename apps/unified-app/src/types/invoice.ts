export type InvoiceType = 'non_gst' | 'gst' | 'custom_gst';

export type InvoiceDeliveryStatus = 'draft' | 'pending' | 'sent';

export type InvoiceDeliveryChannel = 'email' | 'whatsapp' | 'manual';

export type InvoiceLineItem = {
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstRate: number;
};

export type InvoiceRecord = {
  id: string;
  userId: string | null;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  deliveryStatus: InvoiceDeliveryStatus;
  deliveryChannel: InvoiceDeliveryChannel | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  billingAddress: string | null;
  customerState: string | null;
  customerGstin: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subtotal: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
  pdfStoragePath: string | null;
  paymentId: string | null;
  notes: string | null;
  sentAt: string | null;
  sentTo: string | null;
  issueDate: string | null;
  createdAt: string;
  updatedAt: string | null;
  status: string | null;
};

export type InvoiceStats = {
  totalInvoices: number;
  nonGstCount: number;
  gstCount: number;
  customGstCount: number;
  totalRevenue: number;
  completedPayments: number;
  pendingCount: number;
};

export type InvoiceListFilter =
  | 'all'
  | 'pending'
  | 'non_gst_sent'
  | 'gst_sent';

export type InvoiceTypeFilter = 'all' | InvoiceType;

export type CreateInvoiceInput = {
  invoiceType: InvoiceType;
  userId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  billingAddress?: string | null;
  customerState?: string | null;
  customerGstin?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  lineItems: InvoiceLineItem[];
  notes?: string | null;
  deliveryChannel?: InvoiceDeliveryChannel | null;
  saveAsDraft?: boolean;
  paymentId?: string | null;
};

export type SendInvoiceInput = {
  invoiceId: string;
  channel: 'email' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
};

export type BulkSendInvoicesInput = {
  invoiceType: 'non_gst' | 'gst';
  channel: 'email' | 'whatsapp';
  invoiceIds?: string[];
};

export type BulkSendResult = {
  sent: number;
  failed: number;
  errors: { invoiceId: string; message: string }[];
};

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;

export const INVOICE_UNIT_OPTIONS = ['Nos', 'Hours', 'Months', 'Units'] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh (37)',
  'Arunachal Pradesh (12)',
  'Assam (18)',
  'Bihar (10)',
  'Chhattisgarh (22)',
  'Goa (30)',
  'Gujarat (24)',
  'Haryana (06)',
  'Himachal Pradesh (02)',
  'Jharkhand (20)',
  'Karnataka (29)',
  'Kerala (32)',
  'Madhya Pradesh (23)',
  'Maharashtra (27)',
  'Manipur (14)',
  'Meghalaya (17)',
  'Mizoram (15)',
  'Nagaland (13)',
  'Odisha (21)',
  'Punjab (03)',
  'Rajasthan (08)',
  'Sikkim (11)',
  'Tamil Nadu (33)',
  'Telangana (36)',
  'Tripura (16)',
  'Uttar Pradesh (09)',
  'Uttarakhand (05)',
  'West Bengal (19)',
  'Delhi (07)',
  'Jammu and Kashmir (01)',
  'Ladakh (38)',
  'Puducherry (34)',
  'Chandigarh (04)',
] as const;
