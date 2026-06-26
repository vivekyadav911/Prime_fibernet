/**
 * Tax invoice HTML → PDF via expo-print (same pipeline as payslips).
 */
import type { AdminInvoice } from '@/types/api/admin';
import type { InvoiceLineItem, InvoiceRecord, InvoiceType } from '@/types/invoice';
import { amountInWords } from '@/utils/amountInWords';
import { formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { generatePdfFromHtml } from '@/utils/htmlToPdf';

const ACCENT = '#1e40af';
const BORDER = '#e2e8f0';

export type InvoiceCompanySettings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyGstin: string;
  companyState: string;
  footerNote?: string;
  defaultHsnSac?: string;
};

export type InvoicePdfInput = InvoiceRecord & {
  company: InvoiceCompanySettings;
};

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

function invoiceTitle(type: InvoiceType): string {
  if (type === 'non_gst') return 'INVOICE';
  return 'TAX INVOICE';
}

function lineItemRows(items: InvoiceLineItem[], showGst: boolean): string {
  return items
    .map((item, idx) => {
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
    })
    .join('');
}

export function buildInvoiceHtml(invoice: InvoicePdfInput): string {
  const showGst = invoice.invoiceType !== 'non_gst';
  const c = invoice.company;
  const issueDate = invoice.issueDate
    ? new Date(invoice.issueDate).toLocaleDateString('en-IN')
    : new Date(invoice.createdAt).toLocaleDateString('en-IN');
  const placeOfSupply = invoice.customerState ?? c.companyState ?? '—';
  const cgstRate = showGst && invoice.subtotal > 0
    ? Math.round((invoice.cgstAmount / invoice.subtotal) * 10000) / 100
    : 9;
  const sgstRate = showGst && invoice.subtotal > 0
    ? Math.round((invoice.sgstAmount / invoice.subtotal) * 10000) / 100
    : 9;

  const gstHeader = showGst
    ? '<th>GST</th>'
    : '';
  const gstTotals = showGst
    ? `<tr><td colspan="${showGst ? 7 : 6}" class="label">SGST @${sgstRate}%</td><td class="num">${fmtMoney(invoice.sgstAmount)}</td></tr>
       <tr><td colspan="${showGst ? 7 : 6}" class="label">CGST @${cgstRate}%</td><td class="num">${fmtMoney(invoice.cgstAmount)}</td></tr>`
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
      <div class="company-name">${escapeHtml(c.companyName)}</div>
      <div class="company-meta">
        ${escapeHtml(c.companyAddress)}<br/>
        Phone: ${escapeHtml(c.companyPhone)}<br/>
        Email: ${escapeHtml(c.companyEmail)}<br/>
        GSTIN: ${escapeHtml(c.companyGstin)}<br/>
        State: ${escapeHtml(c.companyState)}
      </div>
    </div>
    <div>
      <div class="doc-title">${invoiceTitle(invoice.invoiceType)}</div>
      <div class="doc-meta">
        Invoice No.: ${escapeHtml(invoice.invoiceNumber)}<br/>
        Date: ${escapeHtml(issueDate)}<br/>
        Place of supply: ${escapeHtml(placeOfSupply)}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div class="bill-box">
      <strong>${escapeHtml(invoice.customerName)}</strong><br/>
      ${invoice.billingAddress ? `${escapeHtml(invoice.billingAddress)}<br/>` : ''}
      ${invoice.customerEmail ? `Email: ${escapeHtml(invoice.customerEmail)}<br/>` : ''}
      ${invoice.customerPhone ? `Phone: ${escapeHtml(invoice.customerPhone)}<br/>` : ''}
      ${invoice.customerState ? `State: ${escapeHtml(invoice.customerState)}<br/>` : ''}
      ${invoice.customerGstin ? `GSTIN: ${escapeHtml(invoice.customerGstin)}` : ''}
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>#</th>
        <th>Item Name</th>
        <th>HSN/SAC</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Price/Unit</th>
        ${gstHeader}
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows(invoice.lineItems, showGst)}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">Sub Total</td><td class="num">${fmtMoney(invoice.subtotal)}</td></tr>
      ${gstTotals}
      <tr class="grand-total"><td class="label">Total</td><td class="num">${fmtMoney(invoice.totalAmount)}</td></tr>
      <tr><td class="label">Received</td><td class="num">${fmtMoney(invoice.status === 'paid' ? invoice.totalAmount : 0)}</td></tr>
      <tr><td class="label">Balance</td><td class="num">${fmtMoney(invoice.status === 'paid' ? 0 : invoice.totalAmount)}</td></tr>
    </table>
  </div>

  <div class="words"><strong>Amount in Words:</strong> ${escapeHtml(amountInWords(invoice.totalAmount))}</div>
  ${c.footerNote ? `<div class="footer">${escapeHtml(c.footerNote)}</div>` : '<div class="footer">This is a computer-generated invoice.</div>'}
</body>
</html>`;
}

export async function generateInvoicePDF(invoice: InvoicePdfInput): Promise<string> {
  const html = buildInvoiceHtml(invoice);
  return generatePdfFromHtml(html);
}

export function buildInvoiceStoragePath(userId: string | null, invoiceId: string): string {
  const folder = userId ?? 'manual';
  return `${folder}/${invoiceId}.pdf`;
}

export const INVOICES_BUCKET = 'invoices';

export function computeInvoiceTotals(
  lineItems: InvoiceLineItem[],
  invoiceType: InvoiceType,
): { subtotal: number; gstAmount: number; cgstAmount: number; sgstAmount: number; totalAmount: number } {
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  if (invoiceType === 'non_gst') {
    return { subtotal, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, totalAmount: subtotal };
  }
  const gstAmount = lineItems.reduce(
    (s, i) => s + i.quantity * i.unitPrice * (i.gstRate / 100),
    0,
  );
  const cgstAmount = Math.round(gstAmount * 50) / 100;
  const sgstAmount = gstAmount - cgstAmount;
  return {
    subtotal,
    gstAmount,
    cgstAmount,
    sgstAmount,
    totalAmount: subtotal + gstAmount,
  };
}

export function mapDbRowToInvoiceRecord(row: Record<string, unknown>): InvoiceRecord {
  const lineItemsRaw = (row.line_items as Record<string, unknown>[] | null) ?? [];
  const lineItems: InvoiceLineItem[] = lineItemsRaw.map((item) => ({
    description: String(item.description ?? ''),
    hsnSac: String(item.hsn_sac ?? item.hsnSac ?? ''),
    quantity: Number(item.quantity ?? 1),
    unit: String(item.unit ?? 'Nos'),
    unitPrice: Number(item.unit_price ?? item.unitPrice ?? item.rate ?? 0),
    gstRate: Number(item.gst_rate ?? item.gstRate ?? item.gstPercent ?? 0),
  }));

  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    invoiceNumber: String(row.invoice_number ?? ''),
    invoiceType: (row.invoice_type as InvoiceRecord['invoiceType']) ?? 'gst',
    deliveryStatus: (row.delivery_status as InvoiceRecord['deliveryStatus']) ?? 'draft',
    deliveryChannel: (row.delivery_channel as InvoiceRecord['deliveryChannel']) ?? null,
    customerName: String(row.customer_name ?? 'Customer'),
    customerEmail: (row.customer_email as string) ?? null,
    customerPhone: (row.customer_phone as string) ?? null,
    billingAddress: (row.billing_address as string) ?? null,
    customerState: (row.customer_state as string) ?? null,
    customerGstin: (row.customer_gstin as string) ?? null,
    recipientEmail: (row.recipient_email as string) ?? null,
    recipientPhone: (row.recipient_phone as string) ?? null,
    subtotal: Number(row.subtotal ?? row.amount ?? 0),
    gstAmount: Number(row.gst_amount ?? 0),
    cgstAmount: Number(row.cgst_amount ?? 0),
    sgstAmount: Number(row.sgst_amount ?? 0),
    totalAmount: Number(row.total_amount ?? row.amount ?? 0),
    lineItems,
    pdfStoragePath: (row.pdf_storage_path as string) ?? null,
    paymentId: (row.payment_id as string) ?? null,
    notes: (row.notes as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
    sentTo: (row.sent_to as string) ?? null,
    issueDate: (row.issue_date as string) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: (row.updated_at as string) ?? null,
    status: (row.status as string) ?? null,
  };
}

export function mapInvoiceRecordToAdminInvoice(record: InvoiceRecord): AdminInvoice {
  return {
    id: record.id,
    invoiceNumber: record.invoiceNumber,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    amount: record.subtotal,
    gstAmount: record.gstAmount,
    totalAmount: record.totalAmount,
    date: record.createdAt,
    status: mapDeliveryToAdminStatus(record),
    invoiceType: record.invoiceType,
    deliveryStatus: record.deliveryStatus,
    deliveryChannel: record.deliveryChannel,
    pdfStoragePath: record.pdfStoragePath,
    sentAt: record.sentAt,
    sentTo: record.sentTo,
    lineItems: record.lineItems.map((l) => ({
      description: l.description,
      hsnSac: l.hsnSac,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      gstRate: l.gstRate,
    })),
  };
}

function mapDeliveryToAdminStatus(
  record: InvoiceRecord,
): AdminInvoice['status'] {
  if (record.status === 'paid') return 'paid';
  if (record.deliveryStatus === 'sent') return 'sent';
  if (record.deliveryStatus === 'pending') return 'pending';
  if (record.deliveryStatus === 'draft') return 'draft';
  return 'unpaid';
}
