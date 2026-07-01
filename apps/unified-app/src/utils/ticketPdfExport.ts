import { format } from 'date-fns';

import type { Ticket, TicketFilters } from '@/types/tickets';
import { formatSLARemaining } from '@/utils/slaUtils';
import { truncateTicketNumber } from '@/utils/ticketViewMappers';

async function loadPrintModules() {
  const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
  return { Print, Sharing };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildActivityRows(ticket: Ticket): string {
  return ticket.activityTimeline
    .map(
      (e) =>
        `<tr><td>${escapeHtml(format(e.timestamp, 'MMM dd, yyyy HH:mm'))}</td><td>${escapeHtml(e.type.replace(/_/g, ' '))}</td><td>${escapeHtml(e.performedBy)}</td><td>${escapeHtml(e.description)}</td></tr>`,
    )
    .join('');
}

function buildNotesSection(ticket: Ticket): string {
  const internalNotes = ticket.internalNotes.filter((n) => n.isInternal);
  if (!internalNotes.length) return '<p>No internal notes.</p>';
  return `
    <div class="watermark">INTERNAL</div>
    ${internalNotes
      .map(
        (n) =>
          `<div class="note"><strong>${escapeHtml(n.authorName)}</strong> · ${escapeHtml(format(n.createdAt, 'MMM dd, yyyy HH:mm'))}<br/>${escapeHtml(n.content)}</div>`,
      )
      .join('')}
  `;
}

export async function exportTicketAsPDF(ticket: Ticket): Promise<void> {
  const { Print, Sharing } = await loadPrintModules();
  const generatedAt = format(new Date(), 'MMM dd, yyyy HH:mm');
  const slaBreached =
    ticket.responseSlaStatus === 'breached' || ticket.resolutionSlaStatus === 'breached';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111827; font-size: 12px; }
    h1 { font-size: 20px; color: #5B4FCF; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .meta { color: #6B7280; margin-bottom: 16px; }
    .row { margin-bottom: 6px; }
    .label { font-weight: 600; color: #374151; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th, td { border: 1px solid #E5E7EB; padding: 6px; text-align: left; }
    th { background: #F5F6FA; }
    .note { background: #FEF3C7; padding: 8px; margin-bottom: 8px; border-radius: 4px; }
    .watermark { color: #EF4444; font-weight: 700; font-size: 10px; margin-bottom: 8px; }
    .footer { margin-top: 32px; font-size: 10px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <h1>Prime Fibernet — Ticket Report</h1>
  <div class="meta">Generated ${escapeHtml(generatedAt)}</div>

  <h2>Ticket Information</h2>
  <div class="row"><span class="label">Number:</span> ${escapeHtml(ticket.ticketNumber)}</div>
  <div class="row"><span class="label">Title:</span> ${escapeHtml(ticket.title)}</div>
  <div class="row"><span class="label">Status:</span> ${escapeHtml(ticket.status)}</div>
  <div class="row"><span class="label">Priority:</span> ${escapeHtml(ticket.priority)}</div>
  <div class="row"><span class="label">Created:</span> ${escapeHtml(format(ticket.createdAt, 'MMM dd, yyyy HH:mm'))}</div>
  ${ticket.resolvedAt ? `<div class="row"><span class="label">Resolved:</span> ${escapeHtml(format(ticket.resolvedAt, 'MMM dd, yyyy HH:mm'))}</div>` : ''}

  <h2>Contact Details</h2>
  <div class="row"><span class="label">Name:</span> ${escapeHtml(ticket.contactName)}</div>
  <div class="row"><span class="label">Phone:</span> ${escapeHtml(ticket.contactPhone)}</div>
  <div class="row"><span class="label">Email:</span> ${escapeHtml(ticket.contactEmail || '—')}</div>
  <div class="row"><span class="label">Address:</span> ${escapeHtml(ticket.address || '—')}, ${escapeHtml(ticket.city || '')}</div>

  <h2>SLA Summary</h2>
  <div class="row"><span class="label">Response deadline:</span> ${escapeHtml(format(ticket.slaStatus.responseDeadline, 'MMM dd, yyyy HH:mm'))} (${escapeHtml(formatSLARemaining(ticket.slaStatus.responseRemainingMs))})</div>
  <div class="row"><span class="label">Resolution deadline:</span> ${escapeHtml(format(ticket.slaStatus.resolutionDeadline, 'MMM dd, yyyy HH:mm'))} (${escapeHtml(formatSLARemaining(ticket.slaStatus.resolutionRemainingMs))})</div>
  <div class="row"><span class="label">SLA breached:</span> ${slaBreached ? 'Yes' : 'No'}</div>

  <h2>Complaint Details</h2>
  <div class="row"><span class="label">Type:</span> ${escapeHtml(ticket.complaintType)}</div>
  <div class="row"><span class="label">Tags:</span> ${escapeHtml(ticket.tags.join(', ') || '—')}</div>
  <div class="row">${escapeHtml(ticket.description)}</div>

  <h2>Assigned Officer</h2>
  <div class="row">${escapeHtml(ticket.assignedOfficerName ?? 'Unassigned')}${ticket.assignedOfficerRole ? ` (${escapeHtml(ticket.assignedOfficerRole)})` : ''}</div>

  <h2>Activity Timeline</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Event</th><th>By</th><th>Description</th></tr></thead>
    <tbody>${buildActivityRows(ticket)}</tbody>
  </table>

  <h2>Internal Notes</h2>
  ${buildNotesSection(ticket)}

  <div class="footer">Generated by Prime Fibernet Console | Confidential</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Ticket ${ticket.ticketNumber}`,
    });
  }
}

function buildBulkRows(tickets: Ticket[]): string {
  return tickets
    .map(
      (t) => `
    <tr>
      <td>${escapeHtml(truncateTicketNumber(t.ticketNumber))}</td>
      <td>${escapeHtml(t.contactName)}</td>
      <td>${escapeHtml(t.complaintType)}</td>
      <td>${escapeHtml(t.priority)}</td>
      <td>${escapeHtml(t.status)}</td>
      <td>${escapeHtml(t.assignedOfficerName ?? '—')}</td>
      <td>${escapeHtml(t.responseSlaStatus === 'breached' || t.resolutionSlaStatus === 'breached' ? 'Breached' : 'OK')}</td>
      <td>${escapeHtml(format(t.createdAt, 'MMM dd, yyyy HH:mm'))}</td>
    </tr>`,
    )
    .join('');
}

export async function exportTicketsBulkPDF(
  tickets: Ticket[],
  filters: TicketFilters,
): Promise<void> {
  if (tickets.length === 0) {
    throw new Error('No tickets match the selected filters.');
  }

  const { Print, Sharing } = await loadPrintModules();
  const generatedAt = format(new Date(), 'MMM dd, yyyy HH:mm');
  const filterSummary = [
    filters.status !== 'All' ? `Status: ${filters.status}` : null,
    filters.priority !== 'All' ? `Priority: ${filters.priority}` : null,
    filters.assignment !== 'all' ? `Assignment: ${filters.assignment}` : null,
    filters.slaBreached ? 'SLA: Breached only' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
    h1 { font-size: 20px; color: #5B4FCF; }
    .meta { font-size: 12px; color: #6B7280; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #E5E7EB; padding: 6px; text-align: left; }
    th { background: #F5F6FA; }
  </style>
</head>
<body>
  <h1>Prime Fibernet — Tickets Export</h1>
  <div class="meta">Generated ${escapeHtml(generatedAt)}${filterSummary ? ` · ${escapeHtml(filterSummary)}` : ''} · ${tickets.length} ticket(s)</div>
  <table>
    <thead>
      <tr>
        <th>TKT#</th><th>Contact</th><th>Type</th><th>Priority</th><th>Status</th><th>Officer</th><th>SLA</th><th>Created</th>
      </tr>
    </thead>
    <tbody>${buildBulkRows(tickets)}</tbody>
  </table>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Tickets Export',
    });
  }
}
