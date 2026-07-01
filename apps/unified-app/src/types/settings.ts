export type TimeFormat = '12h' | '24h';
export type ThemeMode = 'light' | 'dark' | 'system';
export type DashboardLayout = 'grid' | 'list';
export type BackupFrequency = 'hourly' | 'daily' | 'weekly';
export type BackupLocation = 'cloud' | 'local';
export type SalaryType = 'monthly' | 'daily' | 'hourly';

export interface AppSettings {
  id: string;
  companyName: string;
  contactEmail: string;
  phoneNumber: string;
  officeAddress: string;
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: TimeFormat;
  notifEmail: boolean;
  notifSms: boolean;
  notifWhatsapp: boolean;
  notifPush: boolean;
  notifInApp: boolean;
  notifEmailProvider: string;
  notifWhatsappProvider: string;
  notifTemplatesEnabled: boolean;
  themeMode: ThemeMode;
  colorScheme: string;
  darkModeEnabled: boolean;
  fontSize: number;
  compactMode: boolean;
  animationsEnabled: boolean;
  dashboardLayout: DashboardLayout;
  showAvatars: boolean;
  showNotificationBadges: boolean;
  maintenanceMode: boolean;
  debugMode: boolean;
  errorReporting: boolean;
  performanceMonitoring: boolean;
  queryOptimization: boolean;
  sessionTimeoutMinutes: number;
  cacheTimeoutMinutes: number;
  autoBackup: boolean;
  backupFrequency: BackupFrequency;
  backupTime: string;
  backupLocation: BackupLocation;
  backupRetentionDays: number;
  backupEncryption: boolean;
  backupCompression: boolean;
  officerTrackingEnabled: boolean;
  locationTrackingEnabled: boolean;
  locationUpdateIntervalMinutes: number;
  attendanceTrackingEnabled: boolean;
  shiftManagementEnabled: boolean;
  autoAssignRequests: boolean;
  updatedAt: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromAddress: string;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  razorpayKeyId: string;
  easebuzzKey: string;
  activeGateway: string;
  featureAiChatbot: boolean;
  featureWhatsapp: boolean;
  featureAutoInvoice: boolean;
}

export type AppSettingsSection =
  | 'general'
  | 'notifications'
  | 'appearance'
  | 'system'
  | 'officers'
  | 'backup';

export interface AdminProfile {
  id: string;
  displayName: string;
  email: string;
  updatedAt: string;
}

export interface OfficerSalaryConfig {
  id: string;
  officerId: string;
  salaryType: SalaryType;
  basicSalary: number;
  hra: number;
  transportAllowance: number;
  otherAllowances: number;
  updatedAt: string;
}

export interface OfficerSalaryRow {
  officerId: string;
  officerName: string;
  officerEmail: string;
  isActive: boolean;
  hasActiveContract: boolean;
  salary: OfficerSalaryConfig | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  category: string | null;
  description: string | null;
  targetEntity: string | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
}

export interface AuditLogFilters {
  actionType?: string;
  category?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface BackupFile {
  id: string;
  filename: string;
  sizeKb: number;
  type: 'sql' | 'excel';
  storagePath: string;
  createdAt: string;
}

export type SettingsNavRoute =
  | 'AdminAccount'
  | 'General'
  | 'Security'
  | 'Officers'
  | 'OfficerSalary'
  | 'Notifications'
  | 'Integrations'
  | 'WhatsAppSettings'
  | 'Appearance'
  | 'System'
  | 'BackupExport'
  | 'AuditLogs';
