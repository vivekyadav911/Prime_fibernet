export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type ItemStatus = 'active' | 'inactive';
export type ActionType = 'add_stock' | 'sold' | 'damaged' | 'returned' | 'assigned' | 'edit';

export interface InventoryCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  iconColor: string;
  iconBgColor: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  model: string;
  status: ItemStatus;
  location: string;
  notes: string;
  totalQuantity: number;
  availableQuantity: number;
  assignedQuantity: number;
  damagedQuantity: number;
  soldQuantity: number;
  unitCost: number;
  totalValue: number;
  stockStatus: StockStatus;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface InventoryHistoryEntry {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  actionType: ActionType;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  notes: string;
  performedBy: string;
  performedByUid: string;
  timestamp: Date;
}

export interface InventoryStats {
  totalItems: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryFilters {
  searchQuery: string;
  categoryId: string | null;
  stockStatus: StockStatus | null;
}

export interface HistoryFilters {
  itemId: string | null;
  actionType: ActionType | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export interface AddItemFormData {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  status: ItemStatus;
  brand: string;
  model: string;
  totalQuantity: string;
  unitCost: string;
  location: string;
  notes: string;
}

export interface QuickActionFormData {
  actionType: 'sold' | 'damaged' | 'returned' | 'add_stock';
  quantity: string;
  notes: string;
}

export interface BulkActionPayload {
  itemIds: string[];
  actionType: 'sold' | 'damaged' | 'returned' | 'add_stock';
  quantity: number;
  notes: string;
}

export interface AssignmentRequest {
  id: string;
  officerId: string;
  officerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  notes: string;
  status: string;
  date: Date;
}

export const DEFAULT_INVENTORY_FILTERS: InventoryFilters = {
  searchQuery: '',
  categoryId: null,
  stockStatus: null,
};

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  itemId: null,
  actionType: null,
  dateFrom: null,
  dateTo: null,
};

export const DEFAULT_ADD_ITEM_FORM: AddItemFormData = {
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  status: 'active',
  brand: '',
  model: '',
  totalQuantity: '0',
  unitCost: '0',
  location: '',
  notes: '',
};

export const DEFAULT_QUICK_ACTION_FORM: QuickActionFormData = {
  actionType: 'sold',
  quantity: '',
  notes: '',
};
