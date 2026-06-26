import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { AttendanceRecord } from '@/types/attendance';

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function buildAttendanceCsv(records: AttendanceRecord[]): string {
  const header = [
    'Date',
    'Officer',
    'Status',
    'Check In',
    'Check Out',
    'Hours',
    'Geofence',
    'Method',
    'Late Minutes',
    'Notes',
    'Manual Entry',
  ].join(',');

  const rows = records.map((r) =>
    [
      r.date,
      r.officerName,
      r.status,
      formatTime(r.checkInTime),
      formatTime(r.checkOutTime),
      r.workingHours != null ? String(r.workingHours) : '',
      r.geofenceName || 'Unassigned zone',
      r.checkInMethod,
      r.lateByMinutes != null ? String(r.lateByMinutes) : '',
      r.notes ?? '',
      r.checkInMethod === 'admin_override' ? 'Yes' : '',
    ]
      .map(escapeCsv)
      .join(','),
  );

  return [header, ...rows].join('\n');
}

export async function shareAttendanceCsv(
  records: AttendanceRecord[],
  fileLabel: string,
): Promise<void> {
  if (records.length === 0) {
    throw new Error('No attendance records to export.');
  }

  const csv = buildAttendanceCsv(records);
  const path = `${FileSystem.cacheDirectory}attendance-${fileLabel}-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export attendance',
    });
  }
}

async function loadPrintModules() {
  const [Print, SharingModule] = await Promise.all([
    import('expo-print'),
    import('expo-sharing'),
  ]);
  return { Print, Sharing: SharingModule };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function shareAttendancePdf(
  records: AttendanceRecord[],
  rangeLabel: string,
): Promise<void> {
  if (records.length === 0) {
    throw new Error('No attendance records to export.');
  }

  const { Print, Sharing: SharingModule } = await loadPrintModules();
  const generatedAt = new Date().toLocaleString();

  const rows = records
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.officerName)}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${escapeHtml(formatTime(r.checkInTime))}</td>
        <td>${escapeHtml(formatTime(r.checkOutTime))}</td>
        <td>${escapeHtml(r.workingHours != null ? String(r.workingHours) : '—')}</td>
        <td>${escapeHtml(r.geofenceName || 'Unassigned zone')}</td>
        <td>${escapeHtml(r.checkInMethod)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111827; font-size: 11px; }
  h1 { font-size: 18px; color: #5B4FCF; }
  .meta { color: #6B7280; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #E5E7EB; padding: 6px; text-align: left; }
  th { background: #F5F6FA; }
</style></head><body>
  <h1>Prime Fibernet — Attendance Report</h1>
  <div class="meta">Period: ${escapeHtml(rangeLabel)} · Generated ${escapeHtml(generatedAt)} · ${records.length} record(s)</div>
  <table>
    <thead><tr><th>Date</th><th>Officer</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Geofence</th><th>Method</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await SharingModule.isAvailableAsync()) {
    await SharingModule.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Attendance report',
    });
  }
}
