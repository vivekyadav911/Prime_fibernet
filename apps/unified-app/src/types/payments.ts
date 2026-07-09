import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';

export type PaymentStatus =
  | 'initiated'
  | 'pending_review'
  | 'cash_collected'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod =
  | 'card'
  | 'upi'
  | 'netbanking'
  | 'wallet'
  | 'cash'
  | 'cheque'
  | 'bank_transfer'
  | 'other';

export type PaymentChannel =
  | 'online_app'
  | 'online_web'
  | 'officer_cash'
  | 'office_cash'
  | 'officer_online'
  | 'auto_debit';

export type GatewaySlug = 'razorpay' | 'easebuzz' | 'payu' | 'cashfree' | 'paytm';

export interface PaymentRecord {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  account_number: string;
  plan_name: string | null;
  amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  method: PaymentMethod;
  channel: PaymentChannel;
  gateway_id: string | null;
  gateway_slug: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
  gateway_raw_response: Record<string, unknown> | null;
  gateway_fee: number | null;
  collected_by: string | null;
  cash_collection_notes: string | null;
  cash_denominations: Record<string, number> | null;
  receipt_number: string | null;
  collection_latitude: number | null;
  collection_longitude: number | null;
  evidence_photo_url: string | null;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  failure_reason: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  due_date: string | null;
  next_due_date: string | null;
  initiated_at: string;
  paid_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string; phone: string | null; customer_id: string | null };
  officer?: { id: string; name: string; email: string | null };
  gateway?: PaymentGatewayRecord;
}

export type CollectionStatus = 'inactive' | 'open' | 'assigned' | 'claimed' | 'collected' | 'failed';

export type PortalNotificationType =
  | 'assignment'
  | 'claim'
  | 'payment_success'
  | 'payment_failed'
  | 'ticket'
  | 'plan_change'
  | 'payment'
  | 'system';

export type NotificationCategory =
  | 'payment'
  | 'plan'
  | 'ticket'
  | 'request'
  | 'outage'
  | 'promo'
  | 'system'
  | 'hr';

export type PortalNotification = {
  id: string;
  recipient_auth_id: string;
  recipient_officer_id: string | null;
  type: PortalNotificationType;
  category: NotificationCategory | null;
  title: string;
  body: string | null;
  action_url: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type CollectionAssignmentEvent = {
  id: string;
  customer_id: string;
  assigned_officer_id: string | null;
  claimed_by_officer_id: string | null;
  status: string;
  actor_id: string | null;
  actor_role: string | null;
  notes: string | null;
  created_at: string;
  event_source?: 'payment' | 'assignment' | string | null;
  payment_id?: string | null;
};

export type PaymentActivityEvent = {
  id: string;
  event_type: string;
  status: string | null;
  title: string;
  notes: string | null;
  actor_role: string | null;
  created_at: string;
};

export type ManualPaymentPayload = {
  customerId: string;
  amount: number;
  method: 'cash' | 'netbanking' | 'upi' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
  confirmed?: boolean;
  ticketId?: string;
  bankAccountId?: string;
  verificationMethod?: 'manual' | 'webhook' | 'qr';
  latitude?: number;
  longitude?: number;
  photoUri?: string;
};

export type BankAccountRecord = {
  id: string;
  nickname: string;
  upi_vpa: string;
  bank_name: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type BankAccountInput = {
  nickname: string;
  upi_vpa: string;
  bank_name?: string;
  is_active?: boolean;
  is_default?: boolean;
};

export type CollectionDashboardKpis = {
  total_outstanding: number;
  collected_today: number;
  pending_review: number;
  failed_today: number;
  open_pool_count: number;
  active_officers: number;
};

export type OfficerAssignedCustomer = {
  id: string;
  name: string;
  customer_id: string;
  phone: string | null;
  outstanding_amount: number;
  next_due_date: string | null;
  payment_status: string | null;
  assignmentType: 'assigned' | 'open_pool' | 'claimed';
  collectionStatus: CollectionStatus | null;
  collectionUpdatedAt: string | null;
};

export interface PaymentGatewayRecord {
  id: string;
  name: string;
  slug: GatewaySlug;
  is_active: boolean;
  is_default: boolean;
  display_name: string | null;
  logo_url: string | null;
  supported_methods: PaymentMethod[];
  credentials: Record<string, string>;
  test_mode: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentFilters {
  status?: PaymentStatus | 'all';
  method?: PaymentMethod | 'all';
  channel?: PaymentChannel | 'all';
  gateway_slug?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  officer_id?: string | 'all';
  sortBy?: 'created_at' | 'total_amount' | 'confirmed_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  /** Skip global confirmed/pending aggregate queries (officer history). */
  skipAggregates?: boolean;
  /** Select payments row only — no customer/officer joins. */
  lite?: boolean;
}

export interface CashDenomination {
  note: 500 | 200 | 100 | 50 | 20 | 10 | 5 | 2 | 1;
  count: number;
}

export interface PaymentAnalyticsRow {
  date: string;
  total_transactions: number;
  confirmed_count: number;
  pending_review_count: number;
  cash_pending_count: number;
  failed_count: number;
  confirmed_revenue: number;
  pending_revenue: number;
  card_count: number;
  upi_count: number;
  netbanking_count: number;
  cash_count: number;
  officer_collected_count: number;
  avg_payment_amount: number;
}

export interface CustomerBill {
  customerId: string;
  customerName: string;
  accountNumber: string;
  planName: string | null;
  planAmount: number;
  taxAmount: number;
  lateFee: number;
  totalPayable: number;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  dueDate: string | null;
  paymentStatus: string;
  outstandingAmount: number;
  lastPaidAmount: number | null;
  lastPaidAt: string | null;
}

export interface ConfirmPaymentPayload {
  paymentId: string;
  nextDueDate: string;
  reviewNotes?: string;
  cashDenominations?: Record<string, number>;
  receiptNumber?: string;
}

export interface CreateOrderPayload {
  customerId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  amount: number;
  planName?: string;
  planId?: string;
  paymentMethod?: PaymentMethod;
  channel?: PaymentChannel;
  /** bill = current cycle due; advance = next cycle; retry = failed payment retry; custom = user-entered amount */
  intent?: 'bill' | 'advance' | 'retry' | 'custom';
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate?: string;
}

export interface CashCollectionPayload {
  customerId: string;
  customerName: string;
  accountNumber: string;
  planName?: string;
  amount: number;
  method?: 'cash' | 'netbanking' | 'upi';
  paymentReference?: string;
  notes?: string;
  denominations?: Record<string, number>;
  dueDate?: string;
  billingStart?: string;
  billingEnd?: string;
  latitude?: number;
  longitude?: number;
  photoUri?: string;
}

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  initiated: {
    label: 'Initiated',
    bg: colors.background,
    text: colors.textSecondary,
    border: colors.borderDefault,
    icon: '⏳',
  },
  pending_review: {
    label: 'Pending Review',
    bg: adminColors.navPillWarningBg,
    text: adminColors.navPillWarningText,
    border: adminColors.badgePending,
    icon: '🔍',
  },
  cash_collected: {
    label: 'Cash Pending',
    bg: '#FFFBEB',
    text: adminColors.navPillWarningText,
    border: adminColors.badgePending,
    icon: '💵',
  },
  confirmed: {
    label: 'Confirmed',
    bg: adminColors.navPillSuccessBg,
    text: adminColors.navPillSuccessText,
    border: adminColors.badgeActive,
    icon: '✅',
  },
  failed: {
    label: 'Failed',
    bg: adminColors.navPillDangerBg,
    text: adminColors.navPillDangerText,
    border: adminColors.badgeDanger,
    icon: '❌',
  },
  refunded: {
    label: 'Refunded',
    bg: '#EFF6FF',
    text: colors.primaryNavy,
    border: colors.accentTeal,
    icon: '↩️',
  },
  cancelled: {
    label: 'Cancelled',
    bg: colors.background,
    text: colors.textSecondary,
    border: colors.borderDefault,
    icon: '🚫',
  },
};

export const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string; icon: string; color: string }
> = {
  card: { label: 'Card (legacy)', icon: '💳', color: '#3B82F6' },
  upi: { label: 'UPI', icon: '📱', color: adminColors.primary },
  netbanking: { label: 'Netbanking', icon: '🏦', color: colors.accentTeal },
  wallet: { label: 'Wallet', icon: '👛', color: adminColors.badgePending },
  cash: { label: 'Cash', icon: '💵', color: adminColors.badgeActive },
  cheque: { label: 'Cheque', icon: '📄', color: colors.textSecondary },
  bank_transfer: { label: 'Bank transfer', icon: '🏦', color: colors.accentTeal },
  other: { label: 'Other', icon: '📝', color: colors.textSecondary },
};

export const DENOMINATION_NOTES: CashDenomination['note'][] = [500, 200, 100, 50, 20, 10, 5, 2, 1];
