import type { TicketPriority } from '@/types/tickets';

export type ChatStatus = 'waiting' | 'active' | 'resolved' | 'missed';
export type FaqStatus = 'published' | 'draft';
export type ComplaintSeverity = 'normal' | 'serious' | 'regulatory';
export type ComplaintStatus = 'received' | 'investigating' | 'resolved' | 'escalated';

export interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Faq {
  id: string;
  categoryId: string | null;
  question: string;
  answer: string;
  isPublished: boolean;
  sortOrder: number;
  isFeatured: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: FaqCategory;
}

export interface ChatSession {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  accountNumber: string | null;
  agentId: string | null;
  agentName: string | null;
  status: ChatStatus;
  channel: string;
  startedAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  waitTimeSeconds: number | null;
  durationSeconds: number | null;
  linkedTicketId: string | null;
  csatScore: number | null;
  csatComment: string | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'agent' | 'customer' | 'system' | 'bot';
  senderId: string | null;
  senderName: string;
  message: string | null;
  messageType: 'text' | 'image' | 'file' | 'quick_reply' | 'card';
  attachmentUrl: string | null;
  attachmentName: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface AgentAvailability {
  id: string;
  agentId: string;
  isOnline: boolean;
  isAvailable: boolean;
  activeChatCount: number;
  maxConcurrentChats: number;
  lastSeenAt: string;
}

export interface CustomerComplaint {
  id: string;
  complaintNumber: string;
  customerId: string | null;
  customerName: string;
  accountNumber: string | null;
  complaintType: string;
  description: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  linkedTicketId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  interactionType: string;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  notes: string | null;
  durationMinutes: number | null;
  agentId: string | null;
  linkedTicketId: string | null;
  linkedChatId: string | null;
  createdAt: string;
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: TicketPriority;
  firstResponseHours: number;
  resolutionHours: number;
  escalationAfterHours: number | null;
  escalateToLevel: number;
  notifyAgent: boolean;
  notifySupervisor: boolean;
  isActive: boolean;
}

export interface CannedResponse {
  id: string;
  title: string;
  shortcut: string | null;
  body: string;
  category: string | null;
  isActive: boolean;
  useCount: number;
}

export interface SupportDashboardStats {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  slaBreaches: number;
  overdueTickets: number;
  avgResolutionHours: number;
  avgCsatScore: number;
  ticketsToday: number;
  ticketsThisWeek: number;
}

export interface SupportAnalyticsData {
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byChannel: Record<string, number>;
  dailyTickets: { date: string; count: number }[];
  dailyCsat: { date: string; score: number }[];
  agentLeaderboard: {
    agentId: string;
    agentName: string;
    resolved: number;
    avgResolutionHours: number;
    avgCsat: number;
  }[];
  slaPerformance: {
    priority: string;
    withinSla: number;
    breached: number;
  }[];
}

export type SupportAnalyticsPeriod = 'today' | 'week' | 'month' | 'custom';

export interface FaqFormData {
  categoryId: string;
  question: string;
  answer: string;
  isPublished: boolean;
  isFeatured: boolean;
  tags: string[];
  sortOrder: number;
}

export interface ComplaintFormData {
  customerId: string | null;
  customerName: string;
  accountNumber: string | null;
  complaintType: string;
  description: string;
  severity: ComplaintSeverity;
  linkedTicketId: string | null;
}
