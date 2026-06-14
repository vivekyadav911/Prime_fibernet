import type {
  ActionType,
  AddItemFormData,
  HistoryFilters,
  InventoryFilters,
  InventoryHistoryEntry,
  InventoryItem,
  InventoryStats,
  ItemStatus,
  StockStatus,
} from '@/types/inventory';

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = parseDate(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

export function formatDateGroupHeader(date: Date): string {
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];
  const d = parseDate(date);
  const day = String(d.getDate()).padStart(2, '0');
  return `${months[d.getMonth()]} ${day}, ${d.getFullYear()}`;
}

export function formatTime(date: Date): string {
  const d = parseDate(date);
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

export function getActionLabel(actionType: ActionType): string {
  const labels: Record<ActionType, string> = {
    add_stock: 'Add Stock',
    sold: 'Sold',
    damaged: 'Mark Damaged',
    returned: 'Returned',
    assigned: 'Assigned',
    edit: 'Edit',
  };
  return labels[actionType] ?? actionType;
}

export function getActionIcon(actionType: ActionType): string {
  const icons: Record<ActionType, string> = {
    add_stock: 'add-circle-outline',
    sold: 'pricetag-outline',
    damaged: 'warning-outline',
    returned: 'arrow-undo-outline',
    assigned: 'person-add-outline',
    edit: 'create-outline',
  };
  return icons[actionType] ?? 'ellipse-outline';
}

export function getActionIconBgColor(actionType: ActionType): string {
  const colors: Record<ActionType, string> = {
    add_stock: '#F0FDF4',
    sold: '#F3F4F6',
    damaged: '#FEF2F2',
    returned: '#EFF6FF',
    assigned: '#FFFBEB',
    edit: '#EEF2FF',
  };
  return colors[actionType] ?? '#F3F4F6';
}

export function getActionIconColor(actionType: ActionType): string {
  const colors: Record<ActionType, string> = {
    add_stock: '#10B981',
    sold: '#6B7280',
    damaged: '#EF4444',
    returned: '#3B82F6',
    assigned: '#F59E0B',
    edit: '#4F46E5',
  };
  return colors[actionType] ?? '#6B7280';
}

export function validateSku(sku: string): string | null {
  const trimmed = sku.trim();
  if (!trimmed) return 'SKU is required';
  if (trimmed.length > 20) return 'SKU must be 20 characters or less';
  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
    return 'SKU can only contain letters, numbers, and hyphens';
  }
  return null;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

export function getStockStatusConfig(status: StockStatus): {
  label: string;
  bgColor: string;
  textColor: string;
  iconName: string;
} {
  const configs: Record<StockStatus, { label: string; bgColor: string; textColor: string; iconName: string }> = {
    in_stock: {
      label: 'In Stock',
      bgColor: '#F0FDF4',
      textColor: '#10B981',
      iconName: 'checkmark-circle-outline',
    },
    low_stock: {
      label: 'Low Stock',
      bgColor: '#FFFBEB',
      textColor: '#F59E0B',
      iconName: 'warning-outline',
    },
    out_of_stock: {
      label: 'Out of Stock',
      bgColor: '#FEF2F2',
      textColor: '#EF4444',
      iconName: 'remove-circle-outline',
    },
  };
  return configs[status];
}

export function computeStockStatus(
  availableQuantity: number,
  lowStockThreshold: number,
): StockStatus {
  if (availableQuantity <= 0) return 'out_of_stock';
  if (availableQuantity <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

export function computeStats(items: InventoryItem[]): InventoryStats {
  return {
    totalItems: items.length,
    totalStock: items.reduce((sum, i) => sum + i.totalQuantity, 0),
    lowStockCount: items.filter((i) => i.stockStatus === 'low_stock').length,
    outOfStockCount: items.filter((i) => i.stockStatus === 'out_of_stock').length,
  };
}

export function applyInventoryFilters(
  items: InventoryItem[],
  filters: InventoryFilters,
): InventoryItem[] {
  let result = [...items];

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.brand.toLowerCase().includes(q) ||
        i.model.toLowerCase().includes(q),
    );
  }

  if (filters.categoryId) {
    result = result.filter((i) => i.categoryId === filters.categoryId);
  }

  if (filters.stockStatus) {
    result = result.filter((i) => i.stockStatus === filters.stockStatus);
  }

  return result;
}

export function groupHistoryByDate(
  entries: InventoryHistoryEntry[],
): { date: string; entries: InventoryHistoryEntry[] }[] {
  const groups = new Map<string, InventoryHistoryEntry[]>();
  for (const entry of entries) {
    const key = formatDateGroupHeader(entry.timestamp);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([date, groupEntries]) => ({
    date,
    entries: groupEntries,
  }));
}

export function countActiveHistoryFilters(filters: HistoryFilters): number {
  let count = 0;
  if (filters.itemId) count += 1;
  if (filters.actionType) count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  return count;
}

export function formatShortDateRange(from: Date | null, to: Date | null): string {
  if (!from && !to) return 'All dates';
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  return `Until ${fmt(to!)}`;
}

function parseItemStatus(raw: unknown): ItemStatus {
  const v = String(raw ?? 'active').toLowerCase();
  return v === 'inactive' ? 'inactive' : 'active';
}

function parseStockStatus(raw: unknown, available: number, threshold: number): StockStatus {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'in_stock' || v === 'low_stock' || v === 'out_of_stock') {
    return v as StockStatus;
  }
  return computeStockStatus(available, threshold);
}

export function mapDbRowToInventoryItem(row: Record<string, unknown>): InventoryItem {
  const legacyQty = Number(row.quantity ?? 0);
  const totalQty = Number(row.total_quantity ?? legacyQty ?? 0);
  const assignedQty = Number(row.assigned_quantity ?? 0);
  const availableQty = Number(
    row.available_quantity ?? Math.max(0, totalQty - assignedQty),
  );
  const lowThreshold = Number(row.low_stock_threshold ?? 5);
  const unitCost = Number(row.unit_cost ?? 0);

  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    sku: String(row.sku ?? ''),
    description: String(row.description ?? ''),
    categoryId: String(row.category_id ?? ''),
    categoryName: String(row.category_name ?? row.category ?? 'General'),
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    status: parseItemStatus(row.status),
    location: String(row.location ?? ''),
    notes: String(row.notes ?? ''),
    totalQuantity: totalQty,
    availableQuantity: availableQty,
    assignedQuantity: assignedQty,
    damagedQuantity: Number(row.damaged_quantity ?? 0),
    soldQuantity: Number(row.sold_quantity ?? 0),
    unitCost,
    totalValue: Number(row.total_value ?? availableQty * unitCost),
    stockStatus: parseStockStatus(row.stock_status, availableQty, lowThreshold),
    lowStockThreshold: lowThreshold,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at ?? row.created_at),
    createdBy: String(row.created_by ?? ''),
  };
}

export function mapDbRowToInventoryCategory(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    iconName: String(row.icon_name ?? 'cube-outline'),
    iconColor: String(row.icon_color ?? '#3B82F6'),
    iconBgColor: String(row.icon_bg_color ?? '#EFF6FF'),
    itemCount: Number(row.item_count ?? 0),
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at ?? row.created_at),
  };
}

export function mapDbRowToHistoryEntry(row: Record<string, unknown>): InventoryHistoryEntry {
  return {
    id: String(row.id),
    itemId: String(row.item_id ?? ''),
    itemName: String(row.item_name ?? ''),
    itemSku: String(row.item_sku ?? ''),
    actionType: String(row.action_type ?? 'edit') as ActionType,
    quantityDelta: Number(row.quantity_delta ?? 0),
    quantityBefore: Number(row.quantity_before ?? 0),
    quantityAfter: Number(row.quantity_after ?? 0),
    notes: String(row.notes ?? ''),
    performedBy: String(row.performed_by ?? 'System'),
    performedByUid: String(row.performed_by_uid ?? ''),
    timestamp: parseDate(row.created_at),
  };
}

export function formDataToDbPayload(
  data: AddItemFormData,
  categoryName: string,
  userId: string,
): Record<string, unknown> {
  const totalQty = Math.max(0, parseInt(data.totalQuantity, 10) || 0);
  const unitCost = Math.max(0, parseFloat(data.unitCost) || 0);
  const stockStatus = computeStockStatus(totalQty, 5);

  return {
    name: data.name.trim(),
    sku: data.sku.trim().toUpperCase(),
    description: data.description.trim(),
    category_id: data.categoryId || null,
    category_name: categoryName,
    brand: data.brand.trim(),
    model: data.model.trim(),
    status: data.status,
    location: data.location.trim(),
    notes: data.notes.trim(),
    total_quantity: totalQty,
    available_quantity: totalQty,
    assigned_quantity: 0,
    damaged_quantity: 0,
    sold_quantity: 0,
    unit_cost: unitCost,
    total_value: totalQty * unitCost,
    low_stock_threshold: 5,
    stock_status: stockStatus,
    created_by: userId || null,
    updated_at: new Date().toISOString(),
  };
}

export function validateAddItemForm(data: AddItemFormData): Partial<Record<keyof AddItemFormData, string>> {
  const errors: Partial<Record<keyof AddItemFormData, string>> = {};

  if (!data.name.trim()) errors.name = 'Item name is required';
  else if (data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  else if (data.name.trim().length > 100) errors.name = 'Name must be 100 characters or less';

  const skuError = validateSku(data.sku);
  if (skuError) errors.sku = skuError;

  if (!data.categoryId) errors.categoryId = 'Please select a category';

  const qty = parseInt(data.totalQuantity, 10);
  if (data.totalQuantity.trim() === '') errors.totalQuantity = 'Quantity is required';
  else if (!Number.isInteger(qty) || qty < 0) errors.totalQuantity = 'Must be a whole number';
  else if (qty > 999999) errors.totalQuantity = 'Cannot exceed 999,999';

  if (data.unitCost.trim() !== '') {
    const cost = parseFloat(data.unitCost);
    if (!Number.isFinite(cost) || cost < 0) errors.unitCost = 'Must be a valid number';
    else if (cost > 9999999) errors.unitCost = 'Cannot exceed 9,999,999';
  }

  return errors;
}

export function inventoryItemToFormData(item: InventoryItem): AddItemFormData {
  return {
    name: item.name,
    sku: item.sku,
    description: item.description,
    categoryId: item.categoryId,
    status: item.status,
    brand: item.brand,
    model: item.model,
    totalQuantity: String(item.totalQuantity),
    unitCost: String(item.unitCost),
    location: item.location,
    notes: item.notes,
  };
}

export const CATEGORY_COLOR_PRESETS = [
  { color: '#3B82F6', bg: '#EFF6FF' },
  { color: '#10B981', bg: '#F0FDF4' },
  { color: '#F59E0B', bg: '#FFFBEB' },
  { color: '#EF4444', bg: '#FEF2F2' },
  { color: '#8B5CF6', bg: '#F5F3FF' },
  { color: '#EC4899', bg: '#FDF2F8' },
  { color: '#0D9488', bg: '#F0FDFA' },
  { color: '#6B7280', bg: '#F3F4F6' },
];

export const CATEGORY_ICON_PRESETS = [
  'wifi-outline',
  'hardware-chip-outline',
  'cable-car-outline',
  'construct-outline',
  'cube-outline',
  'server-outline',
  'radio-outline',
  'flash-outline',
];
