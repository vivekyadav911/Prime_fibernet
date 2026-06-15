export const TICKET_CATEGORIES = {
  connectivity: {
    label: 'Connectivity Issue',
    icon: 'wifi-off',
    color: '#EF4444',
    subCategories: ['No internet', 'Intermittent connection', 'Slow speeds', 'DNS issue', 'IP conflict'],
  },
  billing: {
    label: 'Billing & Payment',
    icon: 'credit-card',
    color: '#3B82F6',
    subCategories: ['Incorrect bill', 'Payment not reflecting', 'Refund request', 'Plan change billing', 'Overcharge'],
  },
  installation: {
    label: 'Installation',
    icon: 'tool',
    color: '#8B5CF6',
    subCategories: ['New installation', 'Rescheduling', 'Equipment not received', 'Incomplete installation'],
  },
  hardware: {
    label: 'Hardware & Equipment',
    icon: 'router',
    color: '#F97316',
    subCategories: ['Router not working', 'ONT/modem issue', 'Cable damage', 'Equipment swap', 'Port issue'],
  },
  plans: {
    label: 'Plans & Upgrades',
    icon: 'arrow-up-circle',
    color: '#10B981',
    subCategories: ['Upgrade plan', 'Downgrade plan', 'Add-on service', 'Plan details query'],
  },
  account: {
    label: 'Account Management',
    icon: 'user',
    color: '#6B7280',
    subCategories: ['Password reset', 'Address change', 'Contact update', 'Service transfer', 'Suspension request'],
  },
  outage: {
    label: 'Outage / Downtime',
    icon: 'alert-triangle',
    color: '#DC2626',
    subCategories: ['Area outage', 'Planned maintenance', 'Partial outage'],
  },
} as const;

export type TicketCategoryKey = keyof typeof TICKET_CATEGORIES;

export const COMPLAINT_TYPES = [
  'service',
  'billing',
  'staff',
  'installation',
  'regulatory',
] as const;
