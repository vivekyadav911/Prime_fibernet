const ACCENT = '#1e40af';
const BORDER = '#e2e8f0';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMoney(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? '';
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t] ?? ''}${o ? ` ${ONES[o]}` : ''}`.trim();
}

function threeDigits(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = h ? `${ONES[h]} Hundred` : '';
  const tail = rest ? twoDigits(rest) : '';
  return [head, tail].filter(Boolean).join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const rupeeWords = integerToWords(rupees);
  const paiseWords = paise > 0 ? ` and ${integerToWords(paise)} Paise` : '';
  return `${rupeeWords} Rupees${paiseWords} only`;
}

type LineItem = {
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstRate: number;
};

export function mapDbLineItems(raw: Record<string, unknown>[] | null | undefined): LineItem[] {
  return (raw ?? []).map((item) => ({
    description: String(item.description ?? ''),
    hsnSac: String(item.hsn_sac ?? item.hsnSac ?? ''),
    quantity: Number(item.quantity ?? 1),
    unit: String(item.unit ?? 'Nos'),
    unitPrice: Number(item.unit_price ?? item.unitPrice ?? item.rate ?? 0),
    gstRate: Number(item.gst_rate ?? item.gstRate ?? item.gstPercent ?? 0),
  }));
}

export function buildInvoiceHtmlFromDb(
  invoice: Record<string, unknown>,
  company: Record<string, unknown>,
): string {
  const invoiceType = String(invoice.invoice_type ?? 'gst');
  const showGst = invoiceType !== 'non_gst';
  const lineItems = mapDbLineItems(invoice.line_items as Record<string, unknown>[] | undefined);
  const subtotal = Number(invoice.subtotal ?? invoice.amount ?? 0);
  const cgstAmount = Number(invoice.cgst_amount ?? 0);
  const sgstAmount = Number(invoice.sgst_amount ?? 0);
  const totalAmount = Number(invoice.total_amount ?? invoice.amount ?? 0);
  const status = String(invoice.status ?? 'unpaid');
  const isPaid = status === 'paid';

  const companyName = String(company.company_name ?? 'Prime Fibernet');
  const companyAddress = String(company.company_address ?? '');
  const companyPhone = String(company.company_phone ?? '');
  const companyEmail = String(company.company_email ?? 'invoices@dizitel.in');
  const companyGstin = String(company.company_gstin ?? '—');
  const companyState = String(company.company_state ?? 'Uttar Pradesh');
  const footerNote = String(company.invoice_footer_note ?? '');

  const issueDate = invoice.issue_date
    ? new Date(String(invoice.issue_date)).toLocaleDateString('en-IN')
    : new Date(String(invoice.created_at ?? Date.now())).toLocaleDateString('en-IN');
  const placeOfSupply = String(invoice.customer_state ?? companyState);
  const cgstRate = showGst && subtotal > 0 ? Math.round((cgstAmount / subtotal) * 10000) / 100 : 9;
  const sgstRate = showGst && subtotal > 0 ? Math.round((sgstAmount / subtotal) * 10000) / 100 : 9;
  const docTitle = showGst ? 'TAX INVOICE' : 'INVOICE';

  const rows = lineItems.map((item, idx) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineGst = showGst ? lineSubtotal * (item.gstRate / 100) : 0;
    const lineTotal = lineSubtotal + lineGst;
    return `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.hsnSac || '—')}</td>
      <td class="num">${item.quantity}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td class="num">${fmtMoney(item.unitPrice)}</td>
      ${showGst ? `<td class="num">${fmtMoney(lineGst)}</td>` : ''}
      <td class="num">${fmtMoney(lineTotal)}</td>
    </tr>`;
  }).join('');

  const gstHeader = showGst ? '<th>GST</th>' : '';
  const gstTotals = showGst
    ? `<tr><td colspan="7" class="label">SGST @${sgstRate}%</td><td class="num">${fmtMoney(sgstAmount)}</td></tr>
       <tr><td colspan="7" class="label">CGST @${cgstRate}%</td><td class="num">${fmtMoney(cgstAmount)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .company-name { font-size: 18px; font-weight: 700; color: ${ACCENT}; }
    .company-meta { font-size: 10px; color: #64748b; margin-top: 4px; line-height: 1.5; }
    .doc-title { font-size: 22px; font-weight: 800; color: ${ACCENT}; text-align: right; }
    .doc-meta { text-align: right; font-size: 10px; color: #334155; margin-top: 6px; line-height: 1.6; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .bill-box { border: 1px solid ${BORDER}; border-radius: 6px; padding: 12px; }
    .items { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .items th { background: ${ACCENT}; color: #fff; padding: 8px 6px; text-align: left; font-size: 10px; }
    .items td { padding: 7px 6px; border-bottom: 1px solid ${BORDER}; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
    .totals table { width: 280px; border-collapse: collapse; }
    .totals td { padding: 5px 8px; border-bottom: 1px solid ${BORDER}; }
    .totals .label { text-align: right; color: #64748b; }
    .grand-total { background: ${ACCENT}; color: #fff; font-weight: 800; font-size: 13px; }
    .words { margin-top: 16px; font-size: 10px; color: #334155; }
    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid ${BORDER}; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${escapeHtml(companyName)}</div>
      <div class="company-meta">
        ${escapeHtml(companyAddress)}<br/>
        Phone: ${escapeHtml(companyPhone)}<br/>
        Email: ${escapeHtml(companyEmail)}<br/>
        GSTIN: ${escapeHtml(companyGstin)}<br/>
        State: ${escapeHtml(companyState)}
      </div>
    </div>
    <div>
      <div class="doc-title">${docTitle}</div>
      <div class="doc-meta">
        Invoice No.: ${escapeHtml(String(invoice.invoice_number ?? ''))}<br/>
        Date: ${escapeHtml(issueDate)}<br/>
        Place of supply: ${escapeHtml(placeOfSupply)}
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="bill-box">
      <strong>${escapeHtml(String(invoice.customer_name ?? 'Customer'))}</strong><br/>
      ${invoice.billing_address ? `${escapeHtml(String(invoice.billing_address))}<br/>` : ''}
      ${invoice.customer_email ? `Email: ${escapeHtml(String(invoice.customer_email))}<br/>` : ''}
      ${invoice.customer_phone ? `Phone: ${escapeHtml(String(invoice.customer_phone))}<br/>` : ''}
      ${invoice.customer_state ? `State: ${escapeHtml(String(invoice.customer_state))}<br/>` : ''}
      ${invoice.customer_gstin ? `GSTIN: ${escapeHtml(String(invoice.customer_gstin))}` : ''}
    </div>
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>#</th><th>Item Name</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Price/Unit</th>
        ${gstHeader}<th>Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td class="label">Sub Total</td><td class="num">${fmtMoney(subtotal)}</td></tr>
      ${gstTotals}
      <tr class="grand-total"><td class="label">Total</td><td class="num">${fmtMoney(totalAmount)}</td></tr>
      <tr><td class="label">Received</td><td class="num">${fmtMoney(isPaid ? totalAmount : 0)}</td></tr>
      <tr><td class="label">Balance</td><td class="num">${fmtMoney(isPaid ? 0 : totalAmount)}</td></tr>
    </table>
  </div>
  <div class="words"><strong>Amount in Words:</strong> ${escapeHtml(amountInWords(totalAmount))}</div>
  <div class="footer">${escapeHtml(footerNote || 'This is a computer-generated invoice.')}</div>
</body>
</html>`;
}

export function resolveEmailFromAddress(company: Record<string, unknown> | null | undefined): string {
  const smtpUser = String(company?.smtp_user ?? '').trim();
  if (smtpUser) return smtpUser;
  return 'Prime Fibernet Billing <invoices@dizitel.in>';
}

export function buildInvoiceEmailHtml(params: {
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  dueDate?: string | null;
  pdfUrl?: string | null;
  lineItems?: LineItem[];
  companyName?: string;
  companyEmail?: string;
  companyWebsite?: string;
}): string {
  const statusLabel = params.status === 'paid' ? 'paid' : 'unpaid';
  const dueDate = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString('en-IN')
    : '—';
  const companyName = params.companyName ?? 'Prime Fibernet';
  const supportEmail = params.companyEmail ?? 'invoices@dizitel.in';
  const companyWebsite = params.companyWebsite ?? 'https://dizitel.in';
  const lineRows = (params.lineItems ?? []).map((item) => {
    const total = item.quantity * item.unitPrice;
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.description)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmtMoney(total)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,64,175,.08);">
    <div style="background:#eff6ff;padding:20px 24px;">
      <div style="font-size:20px;font-weight:800;color:#1e40af;">${escapeHtml(companyName)}</div>
      <div style="font-size:12px;color:#3b82f6;margin-top:4px;">${escapeHtml(companyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</div>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;">Hi ${escapeHtml(params.customerName)},</p>
      <p style="margin:0 0 20px;">Your invoice <strong>${escapeHtml(params.invoiceNumber)}</strong> is ready.</p>
      <table style="width:100%;margin-bottom:20px;font-size:14px;">
        <tr><td style="color:#64748b;padding:6px 0;">Amount due</td><td style="text-align:right;font-weight:700;">${fmtMoney(params.totalAmount)}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Due date</td><td style="text-align:right;">${escapeHtml(dueDate)}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Status</td><td style="text-align:right;font-weight:700;">${escapeHtml(statusLabel)}</td></tr>
      </table>
      ${lineRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px;text-align:left;">Item</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr></thead><tbody>${lineRows}</tbody></table>` : ''}
      ${params.pdfUrl ? `<p style="margin:0;"><a href="${params.pdfUrl}" style="color:#2563eb;">Download invoice PDF</a></p>` : ''}
      <p style="margin:24px 0 0;font-size:12px;color:#64748b;">Questions? Reply to this email or write to ${escapeHtml(supportEmail)}.</p>
    </div>
  </div>
</body></html>`;
}
