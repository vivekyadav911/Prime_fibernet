import { useCallback } from 'react';
import { Alert } from 'react-native';

import {
  assignOfficer as assignOfficerService,
  reassignOfficer as reassignOfficerService,
} from '@/services/requestsService';
import {
  assignOfficer as assignTicketOfficer,
} from '@/services/ticketsService';
import { useAppSelector } from '@/store/hooks';
import type { Officer } from '@/types/requests';

type AssignTarget = {
  kind: 'request' | 'ticket';
  id: string;
  isReassign?: boolean;
  linkedTicketId?: string | null;
  linkedRequestId?: string | null;
};

/**
 * Shared officer assignment for tickets and requests — keeps linked records in sync via DB triggers.
 */
export function useAssignSupportOfficer() {
  const adminName = useAppSelector((s) => s.auth.user?.name ?? 'Admin');

  const assign = useCallback(
    async (target: AssignTarget, officer: Officer) => {
      if (target.kind === 'request') {
        if (target.isReassign) {
          await reassignOfficerService(target.id, officer, adminName);
        } else {
          await assignOfficerService(target.id, officer, adminName);
        }
        return;
      }

      await assignTicketOfficer(target.id, officer, adminName);
    },
    [adminName],
  );

  return { assign, adminName };
}

export function warnLinkedStatusMismatch(
  ticketStatus: string,
  requestStatus: string,
): void {
  const ticketClosed = ['Closed', 'Resolved'].includes(ticketStatus);
  const requestOpen = !['resolved', 'completed', 'cancelled'].includes(requestStatus.toLowerCase());

  if (ticketClosed && requestOpen) {
    Alert.alert(
      'Status mismatch',
      'This ticket is closed/resolved but the linked request is still open. Update the request or reopen the ticket.',
    );
  }
}
