import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from '@/services/supabase';
import type {
  AddItemFormData,
  AssignmentRequest,
  BulkActionPayload,
  HistoryFilters,
  InventoryCategory,
  InventoryHistoryEntry,
  InventoryItem,
  InventoryStats,
  QuickActionFormData,
  StockStatus,
} from '@/types/inventory';
import {
  computeStockStatus,
  computeStats,
  formDataToDbPayload,
  mapDbRowToHistoryEntry,
  mapDbRowToInventoryCategory,
  mapDbRowToInventoryItem,
} from '@/utils/inventoryUtils';

const MIGRATION_FLAG_KEY = 'migration_inventory_v1_done';

async function requireSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in to manage inventory.');
  return { client, session: data.session };
}

async function insertHistory(
  client: ReturnType<typeof getSupabase>,
  params: {
    itemId: string;
    itemName: string;
    itemSku: string;
    actionType: string;
    quantityDelta: number;
    quantityBefore: number;
    quantityAfter: number;
    notes: string;
    userId: string;
    userName: string;
  },
): Promise<void> {
  const { error } = await client.from('inventory_history').insert({
    item_id: params.itemId,
    item_name: params.itemName,
    item_sku: params.itemSku,
    action_type: params.actionType,
    quantity_delta: params.quantityDelta,
    quantity_before: params.quantityBefore,
    quantity_after: params.quantityAfter,
    notes: params.notes,
    performed_by: params.userName || 'System',
    performed_by_uid: params.userId || null,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

function buildQuantityPatch(item: InventoryItem, updates: Partial<InventoryItem>): {
  total_quantity: number;
  available_quantity: number;
  assigned_quantity: number;
  damaged_quantity: number;
  sold_quantity: number;
  total_value: number;
  stock_status: StockStatus;
} {
  const total = updates.totalQuantity ?? item.totalQuantity;
  const available = updates.availableQuantity ?? item.availableQuantity;
  const assigned = updates.assignedQuantity ?? item.assignedQuantity;
  const damaged = updates.damagedQuantity ?? item.damagedQuantity;
  const sold = updates.soldQuantity ?? item.soldQuantity;
  const unitCost = item.unitCost;
  const threshold = item.lowStockThreshold;

  return {
    total_quantity: total,
    available_quantity: available,
    assigned_quantity: assigned,
    damaged_quantity: damaged,
    sold_quantity: sold,
    total_value: available * unitCost,
    stock_status: computeStockStatus(available, threshold),
  };
}

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const { client } = await requireSession();
  const { data, error } = await client
    .from('inventory_items')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapDbRowToInventoryItem(row as Record<string, unknown>));
}

export async function fetchInventoryItemById(itemId: string): Promise<InventoryItem> {
  const { client } = await requireSession();
  const { data, error } = await client
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Item not found');
  return mapDbRowToInventoryItem(data as Record<string, unknown>);
}

export async function createInventoryItem(
  data: AddItemFormData,
  userId: string,
  userName: string,
): Promise<string> {
  const { client } = await requireSession();
  const sku = data.sku.trim().toUpperCase();

  const { data: existing } = await client
    .from('inventory_items')
    .select('id')
    .eq('sku', sku)
    .maybeSingle();
  if (existing) throw new Error('This SKU is already in use');

  const { data: category } = await client
    .from('inventory_categories')
    .select('name')
    .eq('id', data.categoryId)
    .maybeSingle();
  const categoryName = String((category as { name?: string })?.name ?? 'General');

  const payload = {
    ...formDataToDbPayload(data, categoryName, userId),
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error } = await client
    .from('inventory_items')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;

  const item = mapDbRowToInventoryItem(inserted as Record<string, unknown>);
  const totalQty = item.totalQuantity;

  if (data.categoryId) {
    const { data: cat } = await client
      .from('inventory_categories')
      .select('item_count')
      .eq('id', data.categoryId)
      .maybeSingle();
    const count = Number((cat as { item_count?: number })?.item_count ?? 0);
    await client
      .from('inventory_categories')
      .update({ item_count: count + 1, updated_at: new Date().toISOString() })
      .eq('id', data.categoryId);
  }

  if (totalQty > 0) {
    await insertHistory(client, {
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      actionType: 'add_stock',
      quantityDelta: totalQty,
      quantityBefore: 0,
      quantityAfter: totalQty,
      notes: 'Initial stock',
      userId,
      userName,
    });
  }

  return item.id;
}

export async function updateInventoryItem(
  itemId: string,
  data: Omit<AddItemFormData, 'totalQuantity'>,
  userId: string,
  userName: string,
): Promise<void> {
  const { client } = await requireSession();
  const existing = await fetchInventoryItemById(itemId);

  const sku = data.sku.trim().toUpperCase();
  if (sku !== existing.sku) {
    const { data: dup } = await client
      .from('inventory_items')
      .select('id')
      .eq('sku', sku)
      .neq('id', itemId)
      .maybeSingle();
    if (dup) throw new Error('This SKU is already in use');
  }

  let categoryName = existing.categoryName;
  if (data.categoryId && data.categoryId !== existing.categoryId) {
    const { data: category } = await client
      .from('inventory_categories')
      .select('name, item_count')
      .eq('id', data.categoryId)
      .maybeSingle();
    categoryName = String((category as { name?: string })?.name ?? categoryName);

    if (existing.categoryId) {
      const { data: oldCat } = await client
        .from('inventory_categories')
        .select('item_count')
        .eq('id', existing.categoryId)
        .maybeSingle();
      const oldCount = Math.max(0, Number((oldCat as { item_count?: number })?.item_count ?? 1) - 1);
      await client
        .from('inventory_categories')
        .update({ item_count: oldCount, updated_at: new Date().toISOString() })
        .eq('id', existing.categoryId);
    }

    const newCount = Number((category as { item_count?: number })?.item_count ?? 0) + 1;
    await client
      .from('inventory_categories')
      .update({ item_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', data.categoryId);
  }

  const patch = {
    name: data.name.trim(),
    sku,
    description: data.description.trim(),
    category_id: data.categoryId || null,
    category_name: categoryName,
    brand: data.brand.trim(),
    model: data.model.trim(),
    status: data.status,
    location: data.location.trim(),
    notes: data.notes.trim(),
    unit_cost: Math.max(0, parseFloat(data.unitCost) || 0),
    total_value: existing.availableQuantity * Math.max(0, parseFloat(data.unitCost) || 0),
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('inventory_items').update(patch).eq('id', itemId);
  if (error) throw error;

  await insertHistory(client, {
    itemId,
    itemName: data.name.trim(),
    itemSku: sku,
    actionType: 'edit',
    quantityDelta: 0,
    quantityBefore: existing.availableQuantity,
    quantityAfter: existing.availableQuantity,
    notes: 'Item details updated',
    userId,
    userName,
  });
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const { client } = await requireSession();
  const item = await fetchInventoryItemById(itemId);
  if (item.assignedQuantity > 0) {
    throw new Error('Cannot delete item with assigned stock');
  }

  const { error } = await client.from('inventory_items').delete().eq('id', itemId);
  if (error) throw error;

  if (item.categoryId) {
    const { data: cat } = await client
      .from('inventory_categories')
      .select('item_count')
      .eq('id', item.categoryId)
      .maybeSingle();
    const count = Math.max(0, Number((cat as { item_count?: number })?.item_count ?? 1) - 1);
    await client
      .from('inventory_categories')
      .update({ item_count: count, updated_at: new Date().toISOString() })
      .eq('id', item.categoryId);
  }
}

export async function addStock(
  itemId: string,
  quantity: number,
  notes: string,
  userId: string,
  userName: string,
): Promise<void> {
  const { client } = await requireSession();
  const item = await fetchInventoryItemById(itemId);
  const before = item.availableQuantity;
  const after = before + quantity;

  const patch = buildQuantityPatch(item, {
    totalQuantity: item.totalQuantity + quantity,
    availableQuantity: after,
  });

  const { error } = await client.from('inventory_items').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', itemId);
  if (error) throw error;

  await insertHistory(client, {
    itemId,
    itemName: item.name,
    itemSku: item.sku,
    actionType: 'add_stock',
    quantityDelta: quantity,
    quantityBefore: before,
    quantityAfter: after,
    notes,
    userId,
    userName,
  });
}

export async function performQuickAction(
  itemId: string,
  action: QuickActionFormData,
  userId: string,
  userName: string,
): Promise<void> {
  const qty = parseInt(action.quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be at least 1');

  if (action.actionType === 'add_stock') {
    await addStock(itemId, qty, action.notes, userId, userName);
    return;
  }

  const { client } = await requireSession();
  const item = await fetchInventoryItemById(itemId);
  const before = item.availableQuantity;
  let updates: Partial<InventoryItem> = {};
  let quantityDelta = 0;
  let actionType = action.actionType;

  switch (action.actionType) {
    case 'sold': {
      if (qty > item.availableQuantity) {
        throw new Error(`Insufficient available stock. Cannot exceed ${item.availableQuantity}`);
      }
      updates = {
        availableQuantity: item.availableQuantity - qty,
        soldQuantity: item.soldQuantity + qty,
      };
      quantityDelta = -qty;
      break;
    }
    case 'damaged': {
      if (qty > item.availableQuantity) {
        throw new Error(`Insufficient available stock. Cannot exceed ${item.availableQuantity}`);
      }
      updates = {
        availableQuantity: item.availableQuantity - qty,
        damagedQuantity: item.damagedQuantity + qty,
      };
      quantityDelta = -qty;
      break;
    }
    case 'returned': {
      if (qty > item.assignedQuantity) {
        throw new Error(`Insufficient assigned stock. Cannot exceed ${item.assignedQuantity}`);
      }
      updates = {
        availableQuantity: item.availableQuantity + qty,
        assignedQuantity: item.assignedQuantity - qty,
      };
      quantityDelta = qty;
      break;
    }
    default:
      throw new Error('Unknown action type');
  }

  const patch = buildQuantityPatch(item, updates);
  const { error } = await client.from('inventory_items').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', itemId);
  if (error) throw error;

  await insertHistory(client, {
    itemId,
    itemName: item.name,
    itemSku: item.sku,
    actionType,
    quantityDelta,
    quantityBefore: before,
    quantityAfter: updates.availableQuantity ?? before,
    notes: action.notes,
    userId,
    userName,
  });
}

export async function performAssignedAction(
  itemId: string,
  quantity: number,
  notes: string,
  userId: string,
  userName: string,
): Promise<void> {
  const { client } = await requireSession();
  const item = await fetchInventoryItemById(itemId);

  if (quantity > item.availableQuantity) {
    throw new Error(`Insufficient available stock of ${item.availableQuantity}`);
  }

  const before = item.availableQuantity;
  const after = before - quantity;

  const patch = buildQuantityPatch(item, {
    availableQuantity: after,
    assignedQuantity: item.assignedQuantity + quantity,
  });

  const { error } = await client.from('inventory_items').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', itemId);
  if (error) throw error;

  await insertHistory(client, {
    itemId,
    itemName: item.name,
    itemSku: item.sku,
    actionType: 'assigned',
    quantityDelta: -quantity,
    quantityBefore: before,
    quantityAfter: after,
    notes,
    userId,
    userName,
  });
}

export async function bulkAction(
  payload: BulkActionPayload,
  userId: string,
  userName: string,
): Promise<{ succeeded: string[]; failed: { itemId: string; error: string }[] }> {
  const succeeded: string[] = [];
  const failed: { itemId: string; error: string }[] = [];

  for (const itemId of payload.itemIds) {
    try {
      const action: QuickActionFormData = {
        actionType: payload.actionType,
        quantity: String(payload.quantity),
        notes: payload.notes,
      };
      await performQuickAction(itemId, action, userId, userName);
      succeeded.push(itemId);
    } catch (e) {
      failed.push({
        itemId,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return { succeeded, failed };
}

export async function fetchInventoryHistory(
  filters: HistoryFilters,
  pageSize: number,
  lastEntry?: InventoryHistoryEntry,
): Promise<InventoryHistoryEntry[]> {
  const { client } = await requireSession();

  let query = client
    .from('inventory_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (filters.itemId) query = query.eq('item_id', filters.itemId);
  if (filters.actionType) query = query.eq('action_type', filters.actionType);
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString());
  }
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }
  if (lastEntry) {
    query = query.lt('created_at', lastEntry.timestamp.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapDbRowToHistoryEntry(row as Record<string, unknown>));
}

export async function fetchCategories(): Promise<InventoryCategory[]> {
  const { client } = await requireSession();
  const { data, error } = await client
    .from('inventory_categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapDbRowToInventoryCategory(row as Record<string, unknown>));
}

export async function createCategory(
  data: Omit<InventoryCategory, 'id' | 'itemCount' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const { client } = await requireSession();
  const name = data.name.trim();

  const { data: existing } = await client
    .from('inventory_categories')
    .select('id')
    .ilike('name', name)
    .maybeSingle();
  if (existing) throw new Error('Category name already exists');

  const { data: inserted, error } = await client
    .from('inventory_categories')
    .insert({
      name,
      description: data.description.trim(),
      icon_name: data.iconName,
      icon_color: data.iconColor,
      icon_bg_color: data.iconBgColor,
      item_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return String((inserted as { id: string }).id);
}

export async function updateCategory(
  categoryId: string,
  data: Partial<Omit<InventoryCategory, 'id' | 'itemCount' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const { client } = await requireSession();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) patch.description = data.description.trim();
  if (data.iconName !== undefined) patch.icon_name = data.iconName;
  if (data.iconColor !== undefined) patch.icon_color = data.iconColor;
  if (data.iconBgColor !== undefined) patch.icon_bg_color = data.iconBgColor;

  const { error } = await client
    .from('inventory_categories')
    .update(patch)
    .eq('id', categoryId);
  if (error) throw error;

  if (data.name) {
    await client
      .from('inventory_items')
      .update({ category_name: data.name.trim(), updated_at: new Date().toISOString() })
      .eq('category_id', categoryId);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { client } = await requireSession();
  const { data: cat, error: fetchError } = await client
    .from('inventory_categories')
    .select('item_count')
    .eq('id', categoryId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (Number((cat as { item_count?: number })?.item_count ?? 0) > 0) {
    throw new Error('Category has items');
  }

  const { error } = await client.from('inventory_categories').delete().eq('id', categoryId);
  if (error) throw error;
}

export async function fetchAssignmentRequests(status?: string): Promise<AssignmentRequest[]> {
  const { client } = await requireSession();

  let query = client
    .from('inventory_requests')
    .select('*, officers(name), inventory_items(name)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    // Fallback to legacy table name
    let legacyQuery = client
      .from('inventory_assignment_requests')
      .select('*, inventory_items(name)')
      .order('created_at', { ascending: false });
    if (status) legacyQuery = legacyQuery.eq('status', status);
    const legacy = await legacyQuery;
    if (legacy.error) throw legacy.error;
    return (legacy.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        officerId: String(r.requested_by ?? ''),
        officerName: 'Officer',
        itemId: String(r.item_id ?? ''),
        itemName: String((r.inventory_items as { name?: string })?.name ?? 'Item'),
        quantity: 1,
        notes: '',
        status: String(r.status ?? 'pending'),
        date: new Date(String(r.created_at)),
      };
    });
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      officerId: String(r.officer_id ?? ''),
      officerName: String((r.officers as { name?: string })?.name ?? 'Officer'),
      itemId: String(r.item_id ?? ''),
      itemName: String((r.inventory_items as { name?: string })?.name ?? 'Item'),
      quantity: Number(r.quantity ?? 1),
      notes: String(r.notes ?? ''),
      status: String(r.status ?? 'pending'),
      date: new Date(String(r.created_at)),
    };
  });
}

export async function reviewAssignmentRequest(
  requestId: string,
  action: 'approve' | 'reject',
  userId: string,
  userName: string,
): Promise<void> {
  const { client } = await requireSession();

  const table = 'inventory_requests';
  const { data: request, error: fetchError } = await client
    .from(table)
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError || !request) {
    throw new Error('Request not found');
  }

  const r = request as Record<string, unknown>;
  const status = action === 'approve' ? 'approved' : 'rejected';

  if (action === 'approve') {
    const itemId = String(r.item_id);
    const quantity = Number(r.quantity ?? 1);
    const notes = String(r.notes ?? 'Assignment approved');
    await performAssignedAction(itemId, quantity, notes, userId, userName);
  }

  const { error } = await client
    .from(table)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
}

export async function migrateInventoryV1(): Promise<void> {
  const ran = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
  if (ran === 'true') return;

  const { client } = await requireSession();
  const { data: rows, error } = await client.from('inventory_items').select('*');
  if (error) {
    console.warn('[inventoryService] migrateInventoryV1 skipped:', error.message);
    return;
  }

  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>;
    const legacyQty = Number(r.quantity ?? 0);
    const totalQty = Number(r.total_quantity ?? legacyQty ?? 0);
    const assignedQty = Number(r.assigned_quantity ?? 0);
    const availableQty = Number(
      r.available_quantity ?? Math.max(0, totalQty - assignedQty),
    );
    const threshold = Number(r.low_stock_threshold ?? 5);

    const patch: Record<string, unknown> = {};
    if (r.damaged_quantity == null) patch.damaged_quantity = 0;
    if (r.sold_quantity == null) patch.sold_quantity = 0;
    if (r.assigned_quantity == null) patch.assigned_quantity = assignedQty;
    if (r.low_stock_threshold == null) patch.low_stock_threshold = 5;
    if (r.total_quantity == null) patch.total_quantity = totalQty;
    if (r.available_quantity == null) patch.available_quantity = availableQty;
    if (r.stock_status == null) {
      patch.stock_status = computeStockStatus(availableQty, threshold);
    }
    if (r.unit_cost == null) patch.unit_cost = 0;
    if (r.total_value == null) patch.total_value = availableQty * Number(r.unit_cost ?? 0);

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { error: updateError } = await client
        .from('inventory_items')
        .update(patch)
        .eq('id', r.id);
      if (updateError) {
        console.warn('[inventoryService] migrate row skipped:', updateError.message);
      }
    }
  }

  await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

export { computeStats, computeStockStatus };

const inventoryListeners = new Set<(items: InventoryItem[], stats: InventoryStats) => void>();
let inventoryChannel: RealtimeChannel | null = null;
let inventoryRealtimeFailed = false;

async function notifyInventoryListeners() {
  try {
    const items = await fetchInventoryItems();
    const stats = computeStats(items);
    for (const listener of inventoryListeners) {
      listener(items, stats);
    }
  } catch {
    // polling fallback handles refresh
  }
}

export function subscribeToInventoryItems(
  _filters: unknown,
  callback: (items: InventoryItem[], stats: InventoryStats) => void,
): () => void {
  if (inventoryRealtimeFailed) return () => {};

  const client = getSupabase();
  inventoryListeners.add(callback);

  if (!inventoryChannel) {
    inventoryChannel = client
      .channel('inventory-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        void notifyInventoryListeners();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          inventoryRealtimeFailed = true;
        }
      });
  }

  void notifyInventoryListeners();

  return () => {
    inventoryListeners.delete(callback);
    if (inventoryListeners.size === 0 && inventoryChannel) {
      void client.removeChannel(inventoryChannel);
      inventoryChannel = null;
    }
  };
}

const itemListeners = new Map<string, Set<(item: InventoryItem | null) => void>>();
const itemChannels = new Map<string, RealtimeChannel>();

export function subscribeToInventoryItem(
  itemId: string,
  callback: (item: InventoryItem | null) => void,
): () => void {
  const client = getSupabase();
  let listeners = itemListeners.get(itemId);
  if (!listeners) {
    listeners = new Set();
    itemListeners.set(itemId, listeners);
  }
  listeners.add(callback);

  void fetchInventoryItemById(itemId)
    .then(callback)
    .catch(() => callback(null));

  if (!itemChannels.has(itemId)) {
    const channel = client
      .channel(`inventory-item-${itemId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `id=eq.${itemId}` },
        () => {
          void fetchInventoryItemById(itemId)
            .then((item) => {
              const set = itemListeners.get(itemId);
              if (set) for (const fn of set) fn(item);
            })
            .catch(() => {
              const set = itemListeners.get(itemId);
              if (set) for (const fn of set) fn(null);
            });
        },
      )
      .subscribe();
    itemChannels.set(itemId, channel);
  }

  return () => {
    const set = itemListeners.get(itemId);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        itemListeners.delete(itemId);
        const ch = itemChannels.get(itemId);
        if (ch) {
          void client.removeChannel(ch);
          itemChannels.delete(itemId);
        }
      }
    }
  };
}

const categoryListeners = new Set<(categories: InventoryCategory[]) => void>();
let categoryChannel: RealtimeChannel | null = null;

export function subscribeToCategories(
  callback: (categories: InventoryCategory[]) => void,
): () => void {
  const client = getSupabase();
  categoryListeners.add(callback);

  void fetchCategories().then(callback).catch(() => callback([]));

  if (!categoryChannel) {
    categoryChannel = client
      .channel('inventory-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_categories' }, () => {
        void fetchCategories().then((cats) => {
          for (const fn of categoryListeners) fn(cats);
        });
      })
      .subscribe();
  }

  return () => {
    categoryListeners.delete(callback);
    if (categoryListeners.size === 0 && categoryChannel) {
      void client.removeChannel(categoryChannel);
      categoryChannel = null;
    }
  };
}

export function isInventoryRealtimeAvailable(): boolean {
  return !inventoryRealtimeFailed;
}

export const inventoryService = {
  fetchInventoryItems,
  fetchInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  performQuickAction,
  performAssignedAction,
  bulkAction,
  addStock,
  fetchInventoryHistory,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchAssignmentRequests,
  reviewAssignmentRequest,
  migrateInventoryV1,
  subscribeToInventoryItems,
  subscribeToInventoryItem,
  subscribeToCategories,
  computeStats,
  computeStockStatus,
  isInventoryRealtimeAvailable,
};
