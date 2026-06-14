import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchInventoryItems,
  isInventoryRealtimeAvailable,
  migrateInventoryV1,
  subscribeToInventoryItems,
} from '@/services/inventoryService';
import { useAppSelector } from '@/store/hooks';
import type { InventoryFilters, InventoryItem, InventoryStats } from '@/types/inventory';
import { DEFAULT_INVENTORY_FILTERS } from '@/types/inventory';
import { applyInventoryFilters, computeStats } from '@/utils/inventoryUtils';

export function useInventory() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filters, setFiltersState] = useState<InventoryFilters>(DEFAULT_INVENTORY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchInventoryItems();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    void load();
    void (async () => {
      try {
        await migrateInventoryV1();
        await load();
      } catch (e) {
        console.warn('[useInventory] migration failed:', e);
      }
    })();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToInventoryItems(filters, (nextItems) => {
      setItems(nextItems);
      setIsLoading(false);
      setError(null);
    });

    let pollInterval: ReturnType<typeof setInterval> | undefined;
    if (!isInventoryRealtimeAvailable()) {
      pollInterval = setInterval(() => void load(), 30_000);
    }

    return () => {
      unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated, filters, load]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filters.searchQuery]);

  const effectiveFilters = useMemo(
    () => ({ ...filters, searchQuery: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const filteredItems = useMemo(
    () => applyInventoryFilters(items, effectiveFilters),
    [items, effectiveFilters],
  );

  const stats: InventoryStats = useMemo(() => computeStats(items), [items]);

  const setFilters = useCallback((next: InventoryFilters) => {
    setFiltersState(next);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  return {
    items,
    filteredItems,
    stats,
    filters,
    isLoading,
    error,
    selectedIds,
    setFilters,
    toggleSelect,
    selectAll,
    clearSelection,
    refresh,
  };
}
