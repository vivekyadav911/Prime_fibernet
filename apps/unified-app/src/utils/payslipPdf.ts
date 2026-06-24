/**
 * Enterprise payslip HTML → PDF via expo-print (same pipeline as employment contracts).
 * Statutory PF/ESI/TDS compliance is out of scope — deductions are admin line items only.
 */
import type { Payslip, PayslipDailyBreakdown } from '@/types/payslip';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { generatePdfFromHtml } from '@/utils/htmlToPdf';

const ACCENT = '#1e3a5f';
const BORDER = '#e2e8f0';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoney(amount: number): string {
  return formatCurrencyInrPrecise(amount);
}

function buildReferenceNumber(payslip: Payslip): string {
  const ym = payslip.payPeriodStart.slice(0, 7).replace('-', '');
  const shortId = (payslip.employeeIdDisplay ?? payslip.officerId).slice(0, 8).toUpperCase();
  return `PS-${shortId}-${ym}`;
}

const LABEL_SYMBOLS: Record<string, { symbol: string; color: string }> = {
  Present: { symbol: '✓', color: '#16a34a' },
  'Present (Extra Hours)': { symbol: '✓+', color: '#15803d' },
  'Half Day': { symbol: '½', color: '#d97706' },
  'Quarter Day': { symbol: '¼', color: '#d97706' },
  Partial: { symbol: '·', color: '#ca8a04' },
  Absent: { symbol: '✕', color: '#dc2626' },
  'Weekly Off': { symbol: '—', color: '#94a3b8' },
  Holiday: { symbol: '★', color: '#2563eb' },
  Leave: { symbol: 'L', color: '#7c3aed' },
};

function symbolForLabel(label: string): { symbol: string; color: string } {
  return LABEL_SYMBOLS[label] ?? { symbol: '·', color: '#64748b' };
}

function buildCalendarHtml(breakdown: PayslipDailyBreakdown[], periodStart: string): string {
  const parts = periodStart.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map(breakdown.map((d) => [d.date, d]));

  const cells: string[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push('<td class="cal-empty"></td>');
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const row = byDate.get(date);
    const label = row?.displayLabel ?? '';
    const { symbol, color } = label ? symbolForLabel(label) : { symbol: '', color: '#ccc' };
    const hours = row?.actualHours ? `${row.actualHours}h` : '';
    cells.push(`
      <td class="cal-cell">
        <div class="cal-day">${day}</div>
        <div class="cal-symbol" style="color:${color}">${escapeHtml(symbol)}</div>
        <div class="cal-hours">${escapeHtml(hours)}</div>
      </td>`);
  }

  const rows: string[] = [];
  const header = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    .map((d) => `<th>${d}</th>`)
    .join('');

  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push('<td class="cal-empty"></td>');
    rows.push(`<tr>${week.join('')}</tr>`);
  }

  const legend = Object.entries(LABEL_SYMBOLS)
    .map(([label, { symbol, color }]) =>
      `<span class="legend-item"><span style="color:${color}">${symbol}</span> ${escapeHtml(label)}</span>`,
    )
    .join('');

  return `
    <table class="cal-table"><thead><tr>${header}</tr></thead><tbody>${rows.join('')}</tbody></table>
    <div class="cal-legend">${legend}</div>
    <p class="cal-note">Weekly off days vary per employee based on assigned shift schedule.</p>`;
}

export function buildPayslipHtml(payslip: Payslip): string {
  const ref = buildReferenceNumber(payslip);
  const breakdown = payslip.dailyBreakdown ?? [];
  const additions = (payslip.lineItems ?? []).filter((i) => i.itemType === 'addition');
  const deductions = (payslip.lineItems ?? []).filter((i) => i.itemType === 'deduction');
  const leavesTaken = breakdown.filter((d) => d.displayLabel.toLowerCase().includes('leave')).length;
  const daysPresent = breakdown.filter(
    (d) => d.displayLabel === 'Present' || d.displayLabel.includes('Extra'),
  ).length;

  const additionRows = additions
    .map((i) => `<tr><td>${escapeHtml(i.label)}</td><td class="amt">${fmtMoney(i.amount)}</td></tr>`)
    .join('');
  const deductionRows = deductions
    .map((i) => `<tr><td>${escapeHtml(i.label)}</td><td class="amt">${fmtMoney(i.amount)}</td></tr>`)
    .join('');

  const totalEarnings = payslip.grossEarnings + payslip.totalAdditions;
  const logoHtml = payslip.companyLogoUrl
    ? `<img src="${escapeHtml(payslip.companyLogoUrl)}" alt="" class="logo" />`
    : '';

  const generatedAt = new Date().toLocaleString('en-IN');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid ${ACCENT}; padding-bottom: 12px; }
    .company-name { font-size: 18px; font-weight: 700; color: ${ACCENT}; }
    .company-addr { font-size: 10px; color: #64748b; margin-top: 4px; max-width: 280px; }
    .doc-title { font-size: 22px; font-weight: 800; color: ${ACCENT}; text-align: right; }
    .doc-meta { text-align: right; font-size: 10px; color: #64748b; margin-top: 4px; }
    .logo { max-height: 48px; max-width: 120px; margin-bottom: 8px; }
    .payee-box { border: 1px solid ${BORDER}; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
    .payee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .payee-grid dt { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .payee-grid dd { font-size: 11px; margin-bottom: 6px; }
    .stats { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .stat { flex: 1; min-width: 80px; border: 1px solid ${BORDER}; border-radius: 6px; padding: 8px; text-align: center; }
    .stat-val { font-size: 14px; font-weight: 700; color: ${ACCENT}; }
    .stat-lbl { font-size: 8px; text-transform: uppercase; color: #64748b; margin-top: 2px; }
    h3 { font-size: 12px; color: ${ACCENT}; margin-bottom: 8px; }
    .cal-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .cal-table th { font-size: 9px; color: #64748b; padding: 4px; }
    .cal-cell { border: 1px solid ${BORDER}; text-align: center; padding: 4px 2px; vertical-align: top; height: 52px; width: 14.28%; }
    .cal-empty { border: none; }
    .cal-day { font-size: 9px; color: #64748b; }
    .cal-symbol { font-size: 14px; font-weight: 700; line-height: 1.2; }
    .cal-hours { font-size: 8px; color: #94a3b8; }
    .cal-legend { display: flex; flex-wrap: wrap; gap: 8px; font-size: 9px; margin-top: 6px; }
    .legend-item { white-space: nowrap; }
    .cal-note { font-size: 8px; color: #94a3b8; margin-top: 4px; font-style: italic; }
    .earnings { display: flex; gap: 16px; margin-top: 16px; }
    .earn-col { flex: 1; }
    .earn-col table { width: 100%; border-collapse: collapse; }
    .earn-col th { background: ${ACCENT}; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
    .earn-col td { padding: 5px 8px; border-bottom: 1px solid ${BORDER}; }
    .amt { text-align: right; }
    .subtotal { font-weight: 700; background: #f8fafc; }
    .net-pay { margin-top: 12px; padding: 12px; background: ${ACCENT}; color: #fff; font-size: 16px; font-weight: 800; text-align: center; border-radius: 6px; }
    .signatures { display: flex; gap: 24px; margin-top: 24px; }
    .sig-block { flex: 1; }
    .sig-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 4px; font-size: 10px; }
    .footer { margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid ${BORDER}; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHtml}
      <div class="company-name">${escapeHtml(payslip.companyName)}</div>
      <div class="company-addr">${escapeHtml(payslip.companyAddress)}</div>
    </div>
    <div>
      <div class="doc-title">PAYSLIP</div>
      <div class="doc-meta">${escapeHtml(payslip.payPeriodLabel)}</div>
      <div class="doc-meta">Ref: ${escapeHtml(ref)}</div>
    </div>
  </div>

  <div class="payee-box">
    <dl class="payee-grid">
      <div><dt>Employee Name</dt><dd>${escapeHtml(payslip.employeeName)}</dd></div>
      <div><dt>Employee ID</dt><dd>${escapeHtml(payslip.employeeIdDisplay ?? '—')}</dd></div>
      <div><dt>Designation</dt><dd>${escapeHtml(payslip.employeeDesignation)}</dd></div>
      <div><dt>Department</dt><dd>${escapeHtml(payslip.employeeDepartment ?? '—')}</dd></div>
      <div><dt>Pay Period</dt><dd>${escapeHtml(payslip.payPeriodLabel)}</dd></div>
      <div><dt>Bank Account</dt><dd>${payslip.bankAccountLast4 ? `****${escapeHtml(payslip.bankAccountLast4)}` : '—'}</dd></div>
    </dl>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${payslip.totalScheduledDays}</div><div class="stat-lbl">Working Days</div></div>
    <div class="stat"><div class="stat-val">${daysPresent}</div><div class="stat-lbl">Days Present</div></div>
    <div class="stat"><div class="stat-val">${payslip.totalActualHours}</div><div class="stat-lbl">Hours Worked</div></div>
    <div class="stat"><div class="stat-val">${leavesTaken}</div><div class="stat-lbl">Leaves</div></div>
    <div class="stat"><div class="stat-val">${fmtMoney(payslip.hourlyRate)}</div><div class="stat-lbl">Hourly Rate</div></div>
  </div>

  <h3>Monthly Timesheet</h3>
  ${buildCalendarHtml(breakdown, payslip.payPeriodStart)}

  <div class="earnings">
    <div class="earn-col">
      <table>
        <thead><tr><th colspan="2">Earnings</th></tr></thead>
        <tbody>
          <tr>
            <td>Gross Pay (${payslip.totalActualHours} hrs × ${fmtMoney(payslip.hourlyRate)})</td>
            <td class="amt">${fmtMoney(payslip.grossEarnings)}</td>
          </tr>
          ${additionRows}
          <tr class="subtotal"><td>Total Earnings</td><td class="amt">${fmtMoney(totalEarnings)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="earn-col">
      <table>
        <thead><tr><th colspan="2">Deductions</th></tr></thead>
        <tbody>
          ${deductionRows || '<tr><td colspan="2" style="color:#94a3b8">No deductions</td></tr>'}
          <tr class="subtotal"><td>Total Deductions</td><td class="amt">${fmtMoney(payslip.totalDeductions)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="net-pay">NET PAY = ${fmtMoney(payslip.netPay)}</div>

  <div class="signatures">
    <div class="sig-block">
      <div>For ${escapeHtml(payslip.companyName)}</div>
      <div class="sig-line">
        ${escapeHtml(payslip.authorizedSignatureName ?? 'Authorized Signatory')}<br/>
        ${payslip.authorizedAt ? new Date(payslip.authorizedAt).toLocaleDateString('en-IN') : ''}
      </div>
    </div>
    <div class="sig-block">
      <div>Employee Acknowledgement</div>
      <div class="sig-line">
        ${escapeHtml(payslip.employeeName)}<br/>
        Date: _______________
      </div>
    </div>
  </div>

  <div class="footer">
    This is a computer-generated payslip and does not require a physical signature for validity.
    Generated on ${escapeHtml(generatedAt)}.
  </div>
</body>
</html>`;
}

export async function generatePayslipPDF(payslip: Payslip): Promise<string> {
  const html = buildPayslipHtml(payslip);
  return generatePdfFromHtml(html);
}
