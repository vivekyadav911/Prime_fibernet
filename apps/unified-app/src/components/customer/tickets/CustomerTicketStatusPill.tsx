import { CustomerStatusPill, type CustomerStatusTone } from '@/components/customer/ui/CustomerStatusPill';
import type { TicketStatus } from '@/types/customer';

function toneForStatus(status: TicketStatus | string): CustomerStatusTone {
  switch (status) {
    case 'Resolved':
    case 'Closed':
      return 'success';
    case 'Awaiting Customer':
    case 'Awaiting Parts':
      return 'pending';
    case 'Reopened':
      return 'info';
    case 'In Progress':
      return 'info';
    case 'Open':
    default:
      return 'neutral';
  }
}

type CustomerTicketStatusPillProps = {
  status: TicketStatus | string;
};

/** Customer-only ticket status pill — do not use on officer/admin screens. */
export function CustomerTicketStatusPill({ status }: CustomerTicketStatusPillProps) {
  return <CustomerStatusPill label={status} tone={toneForStatus(status)} />;
}
