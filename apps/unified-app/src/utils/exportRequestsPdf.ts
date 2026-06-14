import { format } from 'date-fns';

import type { ServiceRequest } from '@/types/requests';
import { truncateRequestId } from '@/utils/requestViewMappers';

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

function buildTableRows(requests: ServiceRequest[]): string {
  return requests
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(truncateRequestId(r.id))}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(r.customerName)}</td>
      <td>${escapeHtml(r.planName)}</td>
      <td>${escapeHtml(r.status)}</td>
      <td>${escapeHtml(r.assignedOfficerName ?? '—')}</td>
      <td>${escapeHtml(format(r.createdAt, 'MMM dd, yyyy HH:mm'))}</td>
    </tr>`,
    )
    .join('');
}

function buildHtml(requests: ServiceRequest[], title: string): string {
  const generatedAt = format(new Date(), 'MMM dd, yyyy HH:mm');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #5B4FCF; }
    .meta { font-size: 12px; color: #6B7280; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; }
    th { background: #F5F6FA; font-weight: 600; }
    tr:nth-child(even) { background: #FAFAFA; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated ${escapeHtml(generatedAt)} · ${requests.length} request(s)</div>
  <table>
    <thead>
      <tr>
        <th>Request ID</th>
        <th>Type</th>
        <th>Customer</th>
        <th>Plan</th>
        <th>Status</th>
        <th>Assigned Officer</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      ${buildTableRows(requests)}
    </tbody>
  </table>
</body>
</html>`;
}

function buildSingleRequestHtml(request: ServiceRequest): string {
  const events = request.activityTimeline
    .map(
      (e) =>
        `<li><strong>${escapeHtml(e.type.replace(/_/g, ' '))}</strong> — ${escapeHtml(e.description)} (${escapeHtml(format(e.timestamp, 'MMM dd, yyyy HH:mm'))})</li>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
    h1 { font-size: 20px; color: #5B4FCF; }
    h2 { font-size: 14px; margin-top: 20px; color: #374151; }
    p, li { font-size: 12px; line-height: 1.5; }
    .label { font-size: 10px; color: #6B7280; text-transform: uppercase; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Request ${escapeHtml(truncateRequestId(request.id))}</h1>
  <p><span class="label">Type</span><br/>${escapeHtml(request.type)}</p>
  <p><span class="label">Status</span><br/>${escapeHtml(request.status)}</p>
  <p><span class="label">Customer</span><br/>${escapeHtml(request.customerName)}</p>
  <p><span class="label">Email</span><br/>${escapeHtml(request.customerEmail || '—')}</p>
  <p><span class="label">Phone</span><br/>${escapeHtml(request.customerPhone || '—')}</p>
  <p><span class="label">Address</span><br/>${escapeHtml(request.customerAddress || '—')}</p>
  <p><span class="label">Plan</span><br/>${escapeHtml(request.planName)}</p>
  <p><span class="label">Officer</span><br/>${escapeHtml(request.assignedOfficerName ?? 'Unassigned')}</p>
  <h2>Activity Timeline</h2>
  <ul>${events || '<li>No activity recorded</li>'}</ul>
</body>
</html>`;
}

export async function exportRequestsPdf(
  requests: ServiceRequest[],
  title = 'Prime Fibernet — Requests Export',
): Promise<void> {
  const { Print, Sharing } = await loadPrintModules();
  const html = buildHtml(requests, title);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}

export async function exportSingleRequestPdf(request: ServiceRequest): Promise<void> {
  const { Print, Sharing } = await loadPrintModules();
  const html = buildSingleRequestHtml(request);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}
