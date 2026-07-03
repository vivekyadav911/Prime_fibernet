import { z } from 'zod';

export const BillingCycleSchema = z.enum(['monthly', 'quarterly', 'annual']);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const SubscriptionStatusSchema = z.enum([
  'active',
  'expired',
  'cancelled',
  'suspended',
  'pending',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const TicketCategorySchema = z.enum([
  'billing',
  'technical',
  'plan_change',
  'outage',
  'speed_issue',
  'installation',
  'other',
]);
export type TicketCategory = z.infer<typeof TicketCategorySchema>;

export const TicketStatusSchema = z.enum([
  'Open',
  'In Progress',
  'Awaiting Customer',
  'Awaiting Parts',
  'Resolved',
  'Closed',
  'Reopened',
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const NotificationCategorySchema = z.enum([
  'payment',
  'plan',
  'ticket',
  'outage',
  'promo',
  'system',
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const PlanChangeStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'processing',
]);
export type PlanChangeStatus = z.infer<typeof PlanChangeStatusSchema>;

export const SenderTypeSchema = z.enum(['customer', 'officer', 'admin', 'system']);
export type SenderType = z.infer<typeof SenderTypeSchema>;

export const ChatStatusSchema = z.enum(['waiting', 'active', 'resolved', 'missed', 'closed']);
export type ChatStatus = z.infer<typeof ChatStatusSchema>;

export const PlanChangeRequestSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  currentPlanId: z.string().uuid().nullable(),
  requestedPlanId: z.string().uuid().nullable(),
  requestedCycle: BillingCycleSchema,
  reason: z.string().nullable(),
  status: PlanChangeStatusSchema,
  adminNotes: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  createdAt: z.string(),
});
export type PlanChangeRequest = z.infer<typeof PlanChangeRequestSchema>;

export const TicketCustomerMessageSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  senderType: SenderTypeSchema,
  senderId: z.string().uuid().nullable(),
  message: z.string(),
  attachments: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type TicketCustomerMessage = z.infer<typeof TicketCustomerMessageSchema>;

export const CustomerTicketSchema = z.object({
  id: z.string().uuid(),
  ticketNumber: z.string(),
  title: z.string(),
  category: z.string(),
  priority: TicketPrioritySchema,
  status: TicketStatusSchema,
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type CustomerTicket = z.infer<typeof CustomerTicketSchema>;

export const CustomerTicketTimelineItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  timestamp: z.string().nullable(),
  isComplete: z.boolean(),
});
export type CustomerTicketTimelineItem = z.infer<typeof CustomerTicketTimelineItemSchema>;

export type CustomerTicketWithTimeline = CustomerTicket & {
  timeline: CustomerTicketTimelineItem[];
  assignedOfficerName: string | null;
};

export const CustomerPortalNotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  category: NotificationCategorySchema.nullable(),
  title: z.string(),
  body: z.string().nullable(),
  actionUrl: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
  data: z.record(z.unknown()).default({}),
});
export type CustomerPortalNotification = z.infer<typeof CustomerPortalNotificationSchema>;

export type TicketWithMessages = CustomerTicket & {
  messages: TicketCustomerMessage[];
};

export type PlanWithPricing = {
  id: string;
  name: string;
  speedMbps: number;
  priceMonthly: number;
  priceQuarterly: number | null;
  priceAnnual: number | null;
  dataLimitGb: number | null;
  isUnlimited: boolean;
  isFeatured: boolean;
  features: string[];
  isActive: boolean;
  priceForCycle: number;
};

export type CustomerDashboard = {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    customerId: string | null;
  };
  subscription: {
    id: string;
    planName: string;
    speedMbps: number;
    planPrice: number;
    status: SubscriptionStatus;
    endAt: string;
    daysUntilExpiry: number;
    isExpiringSoon: boolean;
    isOverdue: boolean;
    billingCycle: BillingCycle | null;
    dataLimitGb: number | null;
    isUnlimited: boolean;
  } | null;
  outstanding: number;
  nextDueDate: string | null;
  recentPayments: Array<{ id: string; amount: number; status: string; createdAt: string }>;
  openTickets: number;
  unreadNotifications: number;
};
