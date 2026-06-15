export type TicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Awaiting Customer'
  | 'Awaiting Parts'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintType =
  | 'Technical Issue'
  | 'Billing Dispute'
  | 'New Connection'
  | 'Speed Issue'
  | 'No Internet'
  | 'Hardware Fault'
  | 'Relocation'
  | 'Plan Upgrade'
  | 'Plan Downgrade'
  | 'Disconnection Request'
  | 'Other';

export type TicketSource = 'admin' | 'walk_in' | 'phone_call' | 'email' | 'portal';

export interface SLAPolicy {
  priorityLevel: TicketPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

export interface SLAStatus {
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseDeadline: Date;
  resolutionDeadline: Date;
  responseRemainingMs: number;
  resolutionRemainingMs: number;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'pdf' | 'doc' | 'other';
  uploadedBy: string;
  uploadedAt: Date;
  sizeBytes: number;
}

export interface InternalNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
  isInternal: boolean;
  attachments: TicketAttachment[];
}

export interface TicketActivityEvent {
  id: string;
  type:
    | 'created'
    | 'status_changed'
    | 'priority_changed'
    | 'officer_assigned'
    | 'officer_reassigned'
    | 'note_added'
    | 'linked_to_request'
    | 'attachment_added'
    | 'resolved'
    | 'closed'
    | 'reopened'
    | 'sla_breached';
  description: string;
  performedBy: string;
  performedByRole: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  complaintType: ComplaintType;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  description: string;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedOfficerRole: string | null;
  assignedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdByAdminId: string;
  createdByAdminName: string;
  linkedRequestId: string | null;
  linkedRequestNumber: string | null;
  customerId: string | null;
  tags: string[];
  internalNotes: InternalNote[];
  activityTimeline: TicketActivityEvent[];
  attachments: TicketAttachment[];
  slaPolicy: SLAPolicy;
  slaStatus: SLAStatus;
  resolutionSummary: string | null;
  customerNotified: boolean;
  subCategory: string | null;
  accountNumber: string | null;
  firstResponseAt: Date | null;
  escalationLevel: number;
  csatScore: number | null;
  csatComment: string | null;
  csatSentAt: Date | null;
}

export interface TicketFormData {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  complaintType: ComplaintType;
  priority: TicketPriority;
  assignedOfficerId: string | null;
  description: string;
  source: TicketSource;
  linkedRequestId: string | null;
  linkedRequestNumber: string | null;
  customerId: string | null;
  tags: string[];
  subCategory: string | null;
  accountNumber: string | null;
}

export interface TicketFilters {
  status: TicketStatus | 'All';
  priority: TicketPriority | 'All';
  complaintType: ComplaintType | 'All';
  assignment: 'all' | 'assigned' | 'unassigned';
  slaBreached: boolean | null;
  dateRange: { from: Date | null; to: Date | null };
  sortBy: 'newest' | 'oldest' | 'priority_high' | 'sla_urgent';
  searchQuery: string;
}

export interface TicketStats {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  totalBreached: number;
  avgResolutionHours: number;
  byPriority: Record<TicketPriority, number>;
  byComplaintType: Record<ComplaintType, number>;
}
