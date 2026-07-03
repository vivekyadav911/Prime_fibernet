import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { AttendanceRecord } from '@/types/attendance';
import { renderCalendarHtmlToDataUrl } from '@/utils/attendancePdfCalendar';
import {
  buildCalendarMonthCells,
  CALENDAR_STATUS_COLORS,
  chunkCalendarRows,
  listMonthsBetween,
} from '@/utils/attendanceCalendarGrid';
import { formatAttendanceDuration, resolveWorkingHours } from '@/utils/attendanceDuration';
import {
  buildStatusByDateFromRows,
  countAttendanceStatuses,
  type AttendanceStatusDayRow,
  type CanonicalAttendanceStatus,
} from '@/utils/attendanceStatus';
import { generatePdfBlobFromHtml, generatePdfFromHtml } from '@/utils/htmlToPdf';
import { downloadBlobInBrowser, downloadTextInBrowser, isWebBrowser } from '@/utils/webFileDownload';

export type AttendancePdfExportOptions = {
  includeCalendar?: boolean;
  /** Months to render when includeCalendar is true */
  calendarMonths?: Array<{ year: number; month: number }>;
  /** Canonical rows from get_attendance_status_by_day — preferred for status/calendar */
  statusRows?: AttendanceStatusDayRow[];
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

function formatPdfStatus(status: string): string {
  if (status === 'not_yet_recorded') return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPdfCheckInMethod(method?: string): string {
  switch (method) {
    case 'geofence_auto':
      return 'Geofence verified';
    case 'manual_inside':
      return 'In zone';
    case 'approved_outside':
      return 'Outside geofence';
    case 'admin_override':
      return 'Admin override';
    default:
      return method?.trim() ? method.replace(/_/g, ' ') : '—';
  }
}

function formatPdfCell(value: string): string {
  return value.trim() ? escapeHtml(value) : '—';
}

function buildPdfSummaryHtml(summary: ReturnType<typeof countAttendanceStatuses>): string {
  const tiles = [
    { label: 'Present', value: summary.present, tone: '#047857', bg: '#ECFDF5' },
    { label: 'Absent', value: summary.absent, tone: '#B91C1C', bg: '#FEF2F2' },
    { label: 'Late', value: summary.late, tone: '#B45309', bg: '#FFFBEB' },
    { label: 'Half day', value: summary.halfDay, tone: '#0F766E', bg: '#F0FDFA' },
    { label: 'On leave', value: summary.onLeave, tone: '#1D4ED8', bg: '#EFF6FF' },
    { label: 'Holiday', value: summary.holiday, tone: '#4B5563', bg: '#F9FAFB' },
  ];

  return tiles
    .map(
      (tile) => `<div class="summary-tile" style="background:${tile.bg};">
        <div class="summary-value" style="color:${tile.tone};">${tile.value}</div>
        <div class="summary-label">${escapeHtml(tile.label)}</div>
      </div>`,
    )
    .join('');
}

function buildPdfTableRow(
  row: {
    shiftDate: string;
    officerName: string;
    status: string;
    checkIn: string;
    checkOut: string;
    hours: string;
    geofence: string;
    method: string;
  },
  rowIndex: number,
): string {
  const stripe = rowIndex % 2 === 1 ? ' class="row-alt"' : '';
  return `<tr${stripe}>
    <td class="col-date">${formatPdfCell(row.shiftDate)}</td>
    <td class="col-officer">${formatPdfCell(row.officerName)}</td>
    <td class="col-status"><span class="status-pill">${formatPdfCell(formatPdfStatus(row.status))}</span></td>
    <td class="col-time">${formatPdfCell(row.checkIn)}</td>
    <td class="col-time">${formatPdfCell(row.checkOut)}</td>
    <td class="col-hours">${formatPdfCell(row.hours)}</td>
    <td class="col-geofence">${formatPdfCell(row.geofence)}</td>
    <td class="col-method">${formatPdfCell(row.method)}</td>
  </tr>`;
}

const PDF_TABLE_STYLES = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    padding: 28px 32px;
    color: #111827;
    font-size: 10px;
    line-height: 1.45;
  }
  h1 {
    font-size: 20px;
    font-weight: 700;
    color: #5B4FCF;
    margin: 0 0 6px;
    letter-spacing: -0.2px;
  }
  .report-header { margin-bottom: 18px; }
  .meta-line {
    color: #6B7280;
    font-size: 10px;
    margin: 0 0 14px;
  }
  .summary-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }
  .summary-tile {
    min-width: 88px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #E5E7EB;
    text-align: center;
  }
  .summary-value {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .summary-label {
    margin-top: 4px;
    font-size: 9px;
    font-weight: 600;
    color: #4B5563;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #374151;
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .records-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .records-table thead th {
    background: #F3F4F6;
    color: #374151;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    padding: 10px 8px;
    border-bottom: 1px solid #D1D5DB;
    text-align: left;
    vertical-align: bottom;
    white-space: nowrap;
  }
  .records-table tbody td {
    padding: 9px 8px;
    border-bottom: 1px solid #E5E7EB;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .records-table tbody tr:last-child td { border-bottom: none; }
  .records-table tbody tr.row-alt td { background: #FAFAFA; }
  .col-date { width: 9%; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .col-officer { width: 14%; }
  .col-status { width: 10%; }
  .col-time { width: 9%; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .col-hours { width: 8%; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .col-geofence { width: 22%; }
  .col-method { width: 19%; }
  .status-pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    background: #F3F4F6;
    font-size: 9px;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
  }
  .calendar-section { page-break-before: always; margin-top: 24px; }
  .calendar-section h2 {
    font-size: 16px;
    color: #5B4FCF;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 6px;
    margin: 0 0 12px;
  }
`;

function buildStatusByDateFromCanonical(
  statusRows: AttendanceStatusDayRow[],
  officerId?: string,
): Map<string, CanonicalAttendanceStatus> {
  const filtered = officerId
    ? statusRows.filter((row) => row.officerId === officerId)
    : statusRows;
  return buildStatusByDateFromRows(filtered);
}

function calendarCellHtml(cell: {
  day: number;
  inMonth: boolean;
  status?: CanonicalAttendanceStatus;
}): string {
  const bg = cell.status ? CALENDAR_STATUS_COLORS[cell.status] : '#FFFFFF';
  const textColor =
    cell.status && cell.status !== 'holiday' && cell.status !== 'not_yet_recorded'
      ? '#FFFFFF'
      : cell.inMonth
        ? '#374151'
        : '#9CA3AF';
  const border = cell.status ? bg : '#E5E7EB';
  const opacity = cell.inMonth ? 1 : 0.45;

  return `<td bgcolor="${bg}" style="background-color:${bg};color:${textColor};border:1px solid ${border};opacity:${opacity};text-align:center;padding:8px 4px;font-size:12px;font-weight:700;width:14.28%;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${cell.day}</td>`;
}

export function buildCalendarHtmlSection(
  statusRows: AttendanceStatusDayRow[],
  months: Array<{ year: number; month: number }>,
  officerId?: string,
): string {
  const statusByDate = buildStatusByDateFromCanonical(statusRows, officerId);

  return months
    .map(({ year, month }) => {
      const cells = buildCalendarMonthCells(year, month, statusByDate);
      const rows = chunkCalendarRows(cells);
      const rowHtml = rows
        .map((row) => `<tr>${row.map((cell) => calendarCellHtml(cell)).join('')}</tr>`)
        .join('');

      const legendHtml = (Object.keys(CALENDAR_STATUS_COLORS) as CanonicalAttendanceStatus[])
        .map((status) => {
          const color = CALENDAR_STATUS_COLORS[status];
          const label = status === 'not_yet_recorded' ? 'pending' : status.replace('_', ' ');
          return `<span style="display:inline-flex;align-items:center;margin-right:12px;font-size:11px;color:#374151;">
            <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background-color:${color};margin-right:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
            ${label}
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

export function buildAttendanceCsv(
  records: AttendanceRecord[],
  statusRows?: AttendanceStatusDayRow[],
): string {
  const header = [
    'Date',
    'Officer',
    'Canonical Status',
    'Check In',
    'Check Out',
    'Hours',
    'Geofence',
    'Method',
    'Late Minutes',
    'Notes',
    'Manual Entry',
  ].join(',');

  const canonicalByKey = new Map<string, CanonicalAttendanceStatus>();
  for (const row of statusRows ?? []) {
    canonicalByKey.set(`${row.officerId}:${row.shiftDate}`, row.status);
  }

  const exportRows =
    statusRows && statusRows.length > 0
      ? statusRows.map((row) => {
          const record = records.find(
            (r) => r.officerId === row.officerId && r.date === row.shiftDate,
          );
          const hours = record ? resolveWorkingHours(record) : undefined;
          return [
            row.shiftDate,
            row.officerName,
            row.status,
            formatTime(row.checkInTime ?? record?.checkInTime),
            formatTime(row.checkOutTime ?? record?.checkOutTime),
            hours != null ? String(hours) : '',
            record?.geofenceName || 'Unassigned zone',
            row.checkInMethod ?? record?.checkInMethod ?? '',
            record?.lateByMinutes != null ? String(record.lateByMinutes) : '',
            record?.notes ?? '',
            row.checkInMethod === 'admin_override' || record?.checkInMethod === 'admin_override'
              ? 'Yes'
              : '',
          ]
            .map(escapeCsv)
            .join(',');
        })
      : records.map((r) => {
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

  return [header, ...exportRows].join('\n');
}

async function buildAttendancePdfHtml(
  records: AttendanceRecord[],
  rangeLabel: string,
  options?: AttendancePdfExportOptions,
): Promise<string> {
  const generatedAt = new Date().toLocaleString();
  const statusRows = [...(options?.statusRows ?? [])].sort((a, b) => {
    const byDate = a.shiftDate.localeCompare(b.shiftDate);
    if (byDate !== 0) return byDate;
    return a.officerName.localeCompare(b.officerName);
  });
  const summary = countAttendanceStatuses(statusRows);

  const tableRows =
    statusRows.length > 0
      ? statusRows
          .map((row, index) => {
            const record = records.find(
              (r) => r.officerId === row.officerId && r.date === row.shiftDate,
            );
            return buildPdfTableRow(
              {
                shiftDate: row.shiftDate,
                officerName: row.officerName,
                status: row.status,
                checkIn: formatTime(row.checkInTime ?? record?.checkInTime),
                checkOut: formatTime(row.checkOutTime ?? record?.checkOutTime),
                hours: record ? formatAttendanceDuration(record) : '',
                geofence: record?.geofenceName || 'Unassigned zone',
                method: formatPdfCheckInMethod(row.checkInMethod ?? record?.checkInMethod),
              },
              index,
            );
          })
          .join('')
      : [...records]
          .sort((a, b) => a.date.localeCompare(b.date) || a.officerName.localeCompare(b.officerName))
          .map((r, index) =>
            buildPdfTableRow(
              {
                shiftDate: r.date,
                officerName: r.officerName,
                status: r.status,
                checkIn: formatTime(r.checkInTime),
                checkOut: formatTime(r.checkOutTime),
                hours: formatAttendanceDuration(r),
                geofence: r.geofenceName || 'Unassigned zone',
                method: formatPdfCheckInMethod(r.checkInMethod),
              },
              index,
            ),
          )
          .join('');

  let calendarSection = '';
  if (options?.includeCalendar && options.calendarMonths?.length && statusRows.length > 0) {
    const calendarHtml = buildCalendarHtmlSection(statusRows, options.calendarMonths);

    if (isWebBrowser()) {
      const dataUrl = await renderCalendarHtmlToDataUrl(calendarHtml);
      calendarSection = `<div class="calendar-section">
        <h2>Attendance calendar</h2>
        <img src="${dataUrl}" alt="Attendance calendar" style="width:100%;max-width:700px;display:block;" />
      </div>`;
    } else {
      calendarSection = `<div class="calendar-section">
        <h2>Attendance calendar</h2>
        ${calendarHtml}
      </div>`;
    }
  }

  const rowCount = statusRows.length > 0 ? statusRows.length : records.length;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>${PDF_TABLE_STYLES}</style></head><body>
  <div class="report-header">
    <h1>Prime Fibernet — Attendance Report</h1>
    <p class="meta-line">Period: ${escapeHtml(rangeLabel)} &nbsp;|&nbsp; Generated ${escapeHtml(generatedAt)} &nbsp;|&nbsp; ${rowCount} row(s)</p>
    <div class="summary-grid">${buildPdfSummaryHtml(summary)}</div>
  </div>
  <p class="section-title">Attendance records</p>
  <table class="records-table">
    <thead><tr>
      <th class="col-date">Date</th>
      <th class="col-officer">Officer</th>
      <th class="col-status">Status</th>
      <th class="col-time">Check in</th>
      <th class="col-time">Check out</th>
      <th class="col-hours">Hours</th>
      <th class="col-geofence">Geofence</th>
      <th class="col-method">Method</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  ${calendarSection}
</body></html>`;
}

function sanitizeFileLabel(label: string): string {
  return label.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
}

/** Synchronous web CSV download — call directly from a click handler. */
export function downloadAttendanceCsvInBrowser(
  records: AttendanceRecord[],
  fileLabel: string,
  statusRows?: AttendanceStatusDayRow[],
): void {
  if (records.length === 0 && (!statusRows || statusRows.length === 0)) {
    throw new Error('No attendance records to export.');
  }
  const csv = buildAttendanceCsv(records, statusRows);
  const filename = `attendance-${sanitizeFileLabel(fileLabel)}-${Date.now()}.csv`;
  downloadTextInBrowser(csv, filename, 'text/csv;charset=utf-8');
}

export async function shareAttendanceCsv(
  records: AttendanceRecord[],
  fileLabel: string,
  statusRows?: AttendanceStatusDayRow[],
): Promise<void> {
  if (records.length === 0 && (!statusRows || statusRows.length === 0)) {
    throw new Error('No attendance records to export.');
  }

  if (isWebBrowser()) {
    downloadAttendanceCsvInBrowser(records, fileLabel, statusRows);
    return;
  }

  const csv = buildAttendanceCsv(records, statusRows);
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
