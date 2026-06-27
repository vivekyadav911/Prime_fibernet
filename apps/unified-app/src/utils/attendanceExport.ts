import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { renderCalendarHtmlToDataUrl } from '@/utils/attendancePdfCalendar';
import {
  buildCalendarMonthCells,
  CALENDAR_STATUS_COLORS,
  chunkCalendarRows,
  listMonthsBetween,
} from '@/utils/attendanceCalendarGrid';
import { formatAttendanceDuration, resolveWorkingHours } from '@/utils/attendanceDuration';
import { generatePdfBlobFromHtml, generatePdfFromHtml } from '@/utils/htmlToPdf';
import { downloadBlobInBrowser, downloadTextInBrowser, isWebBrowser } from '@/utils/webFileDownload';

export type AttendancePdfExportOptions = {
  includeCalendar?: boolean;
  /** Months to render when includeCalendar is true */
  calendarMonths?: Array<{ year: number; month: number }>;
};

const STATUS_PRIORITY: Record<AttendanceStatus, number> = {
  absent: 6,
  late: 5,
  half_day: 4,
  on_leave: 3,
  present: 2,
  holiday: 1,
};

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function buildStatusByDate(records: AttendanceRecord[]): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>();
  for (const record of records) {
    const existing = map.get(record.date);
    if (!existing || STATUS_PRIORITY[record.status] > STATUS_PRIORITY[existing]) {
      map.set(record.date, record.status);
    }
  }
  return map;
}

function calendarCellHtml(cell: {
  day: number;
  inMonth: boolean;
  status?: AttendanceStatus;
}): string {
  const bg = cell.status ? CALENDAR_STATUS_COLORS[cell.status] : '#FFFFFF';
  const textColor = cell.status ? '#FFFFFF' : cell.inMonth ? '#374151' : '#9CA3AF';
  const border = cell.status ? bg : '#E5E7EB';
  const opacity = cell.inMonth ? 1 : 0.45;

  return `<td bgcolor="${bg}" style="background-color:${bg};color:${textColor};border:1px solid ${border};opacity:${opacity};text-align:center;padding:8px 4px;font-size:12px;font-weight:700;width:14.28%;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${cell.day}</td>`;
}

export function buildCalendarHtmlSection(
  records: AttendanceRecord[],
  months: Array<{ year: number; month: number }>,
): string {
  const statusByDate = buildStatusByDate(records);

  return months
    .map(({ year, month }) => {
      const cells = buildCalendarMonthCells(year, month, statusByDate);
      const rows = chunkCalendarRows(cells);
      const rowHtml = rows
        .map((row) => `<tr>${row.map((cell) => calendarCellHtml(cell)).join('')}</tr>`)
        .join('');

      const legendHtml = (Object.keys(CALENDAR_STATUS_COLORS) as AttendanceStatus[])
        .map((status) => {
          const color = CALENDAR_STATUS_COLORS[status];
          return `<span style="display:inline-flex;align-items:center;margin-right:12px;font-size:11px;color:#374151;">
            <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background-color:${color};margin-right:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
            ${status.replace('_', ' ')}
          </span>`;
        })
        .join('');

      return `<div class="calendar-month" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <h2 style="font-size:15px;margin:16px 0 10px;color:#5B4FCF;font-weight:700;">${escapeHtml(monthLabel(year, month))}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed;">
          <thead><tr>
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              .map(
                (d) =>
                  `<th style="font-size:10px;padding:6px 4px;color:#6B7280;font-weight:700;text-transform:uppercase;">${d}</th>`,
              )
              .join('')}
          </tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">${legendHtml}</div>
      </div>`;
    })
    .join('');
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

  const rows = records.map((r) => {
    const hours = resolveWorkingHours(r);
    return [
      r.date,
      r.officerName,
      r.status,
      formatTime(r.checkInTime),
      formatTime(r.checkOutTime),
      hours != null ? String(hours) : '',
      r.geofenceName || 'Unassigned zone',
      r.checkInMethod,
      r.lateByMinutes != null ? String(r.lateByMinutes) : '',
      r.notes ?? '',
      r.checkInMethod === 'admin_override' ? 'Yes' : '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [header, ...rows].join('\n');
}

async function buildAttendancePdfHtml(
  records: AttendanceRecord[],
  rangeLabel: string,
  options?: AttendancePdfExportOptions,
): Promise<string> {
  const generatedAt = new Date().toLocaleString();
  const rows = records
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.officerName)}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${escapeHtml(formatTime(r.checkInTime))}</td>
        <td>${escapeHtml(formatTime(r.checkOutTime))}</td>
        <td>${escapeHtml(formatAttendanceDuration(r))}</td>
        <td>${escapeHtml(r.geofenceName || 'Unassigned zone')}</td>
        <td>${escapeHtml(r.checkInMethod)}</td>
      </tr>`,
    )
    .join('');

  let calendarSection = '';
  if (options?.includeCalendar && options.calendarMonths?.length) {
    const calendarHtml = buildCalendarHtmlSection(records, options.calendarMonths);

    if (isWebBrowser()) {
      const dataUrl = await renderCalendarHtmlToDataUrl(calendarHtml);
      calendarSection = `<div style="page-break-before:always;margin-top:24px;">
        <h2 style="font-size:16px;color:#5B4FCF;border-bottom:1px solid #E5E7EB;padding-bottom:6px;margin-bottom:12px;">Attendance calendar</h2>
        <img src="${dataUrl}" alt="Attendance calendar" style="width:100%;max-width:700px;display:block;" />
      </div>`;
    } else {
      calendarSection = `<div style="page-break-before:always;margin-top:24px;">
        <h2 style="font-size:16px;color:#5B4FCF;border-bottom:1px solid #E5E7EB;padding-bottom:6px;margin-bottom:12px;">Attendance calendar</h2>
        ${calendarHtml}
      </div>`;
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
  ${calendarSection}
</body></html>`;
}

function sanitizeFileLabel(label: string): string {
  return label.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
}

/** Synchronous web CSV download — call directly from a click handler. */
export function downloadAttendanceCsvInBrowser(records: AttendanceRecord[], fileLabel: string): void {
  if (records.length === 0) {
    throw new Error('No attendance records to export.');
  }
  const csv = buildAttendanceCsv(records);
  const filename = `attendance-${sanitizeFileLabel(fileLabel)}-${Date.now()}.csv`;
  downloadTextInBrowser(csv, filename, 'text/csv;charset=utf-8');
}

export async function shareAttendanceCsv(
  records: AttendanceRecord[],
  fileLabel: string,
): Promise<void> {
  if (records.length === 0) {
    throw new Error('No attendance records to export.');
  }

  if (isWebBrowser()) {
    downloadAttendanceCsvInBrowser(records, fileLabel);
    return;
  }

  const csv = buildAttendanceCsv(records);
  const filename = `attendance-${sanitizeFileLabel(fileLabel)}-${Date.now()}.csv`;
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export attendance',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export async function shareAttendancePdf(
  records: AttendanceRecord[],
  rangeLabel: string,
  options?: AttendancePdfExportOptions,
): Promise<void> {
  if (records.length === 0) {
    throw new Error('No attendance records to export.');
  }

  const html = await buildAttendancePdfHtml(records, rangeLabel, options);
  const filename = `attendance-${sanitizeFileLabel(rangeLabel)}-${Date.now()}.pdf`;

  if (isWebBrowser()) {
    const blob = await generatePdfBlobFromHtml(html);
    await downloadBlobInBrowser(blob, filename);
    return;
  }

  const uri = await generatePdfFromHtml(html);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Attendance report',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export function resolveExportCalendarMonths(
  records: AttendanceRecord[],
  useDateRange: boolean,
  dateFrom: string,
  dateTo: string,
  selectedDate: string,
): Array<{ year: number; month: number }> {
  if (useDateRange) {
    return listMonthsBetween(dateFrom, dateTo);
  }

  const d = new Date(selectedDate);
  return [{ year: d.getFullYear(), month: d.getMonth() + 1 }];
}
