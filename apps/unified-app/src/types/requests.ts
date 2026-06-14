export type RequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
export type RequestType = 'New Connection' | 'Issue' | 'Relocation' | 'Upgrade' | 'Disconnection';
export type RequestSource = 'customer' | 'admin';

export interface ActivityEvent {
  id: string;
  type: 'note_added' | 'status_updated' | 'self_assigned' | 'officer_assigned' | 'officer_reassigned';
  description: string;
  performedBy: string;
  performedByRole?: string;
  timestamp: Date;
}

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  type: RequestType;
  status: RequestStatus;
  source: RequestSource;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  planId: string | null;
  planName: string;
  planIsActive: boolean | null;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  assignedOfficerRole: string | null;
  createdAt: Date;
  assignedAt: Date | null;
  completedAt: Date | null;
  activityTimeline: ActivityEvent[];
  notes: string[];
}

export interface Officer {
  id: string;
  name: string;
  role: string;
  area: string;
  avatarInitials: string;
}

export interface RequestFilters {
  status: RequestStatus | 'All';
  source: RequestSource | 'All';
  assignment: 'all' | 'assigned' | 'unassigned';
  sortBy: 'newest' | 'oldest';
  searchQuery: string;
}

export type ExportRequestFilters = {
  status: RequestStatus | 'All';
  sortBy: 'newest' | 'oldest';
  assignment: 'all' | 'assigned' | 'unassigned';
};
