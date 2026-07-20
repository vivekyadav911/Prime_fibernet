import * as XLSX from 'xlsx';

import { shareBlob } from '@/utils/shareFile';
import { downloadBlobInBrowser, isWebBrowser } from '@/utils/webFileDownload';

export type ImportEntityType = 'users' | 'plans' | 'officers' | 'transactions';

export type ImportColumnDef = {
  key: string;
  required?: boolean;
  example: string | number | boolean;
};

/** Column definitions — must stay aligned with supabase/functions/import-excel. */
export const IMPORT_ENTITY_COLUMNS: Record<ImportEntityType, ImportColumnDef[]> = {
  users: [
    { key: 'email', required: true, example: 'customer@example.com' },
    { key: 'name', required: true, example: 'EXAMPLE — Jane Doe' },
    { key: 'phone', example: '9876543210' },
    { key: 'first_name', example: 'Jane' },
    { key: 'middle_name', example: '' },
    { key: 'last_name', example: 'Doe' },
    { key: 'customer_id', example: 'ACC-10001' },
    { key: 'username', example: 'jane.doe' },
    { key: 'address', example: '12 Main St' },
    { key: 'city', example: 'Lucknow' },
    { key: 'district', example: 'Lucknow' },
    { key: 'state', example: 'UP' },
    { key: 'pincode', example: '226001' },
  ],
  plans: [
    { key: 'name', required: true, example: 'EXAMPLE — Fiber 100' },
    { key: 'display_name', example: 'Fiber 100 Mbps' },
    { key: 'speed', example: '100 Mbps' },
    { key: 'speed_mbps', example: 100 },
    { key: 'price', required: true, example: 499 },
    { key: 'validity_days', example: 30 },
    { key: 'description', example: 'Unlimited fiber plan' },
    { key: 'is_active', example: true },
    { key: 'plan_tag', example: 'popular' },
    { key: 'category', example: 'standard' },
    { key: 'data_limit', example: 'Unlimited' },
  ],
  officers: [
    { key: 'employee_id', required: true, example: 'EXAMPLE — EMP-001' },
    { key: 'full_name', example: 'Rahul Sharma' },
    { key: 'email', example: 'rahul@example.com' },
    { key: 'phone', example: '9876543210' },
    { key: 'alternate_phone', example: '' },
    { key: 'status', example: 'active' },
    { key: 'city', example: 'Lucknow' },
    { key: 'state', example: 'UP' },
    { key: 'pincode', example: '226001' },
    { key: 'current_address', example: 'Field office' },
  ],
  transactions: [
    { key: 'payment_number', required: true, example: 'EXAMPLE — PAY-2026-000001' },
    { key: 'notes', example: 'Follow-up note' },
    { key: 'review_notes', example: '' },
    { key: 'cash_collection_notes', example: '' },
    { key: 'amount', example: 499 },
    { key: 'total_amount', example: 499 },
    { key: 'status', example: 'pending_review' },
  ],
};

export const IMPORT_ENTITY_LABELS: Record<ImportEntityType, string> = {
  users: 'Users',
  plans: 'Plans',
  officers: 'Officers',
  transactions: 'Transactions',
};

function headerLabel(col: ImportColumnDef): string {
  return col.required ? `${col.key} (required)` : col.key;
}

export function buildImportTemplate(entity: ImportEntityType): { blob: Blob; filename: string } {
  const cols = IMPORT_ENTITY_COLUMNS[entity];
  const headers = cols.map(headerLabel);
  const example = cols.map((c) => c.example);

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = cols.map((c) => ({
    wch: Math.max(headerLabel(c).length, String(c.example).length, 14) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, IMPORT_ENTITY_LABELS[entity].slice(0, 31));
  let buffer: ArrayBuffer;
  try {
    buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  } catch (e) {
    throw e;
  }
  let blob: Blob;
  try {
    blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch (e) {
    throw e;
  }
  return { blob, filename: `${entity}_import_template.xlsx` };
}

export async function downloadImportTemplate(entity: ImportEntityType): Promise<void> {
  const { blob, filename } = buildImportTemplate(entity);
  if (isWebBrowser()) {
    await downloadBlobInBrowser(blob, filename);
  } else {
    await shareBlob(blob, filename);
  }
}
