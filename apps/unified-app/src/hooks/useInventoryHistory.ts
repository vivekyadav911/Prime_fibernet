import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchInventoryHistory } from '@/services/inventoryService';
import type { HistoryFilters, InventoryHistoryEntry } from '@/types/inventory';
import { DEFAULT_HISTORY_FILTERS } from '@/types/inventory';
import { groupHistoryByDate } from '@/utils/inventoryUtils';

const PAGE_SIZE = 20;

export function useInventoryHistory() {
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (append = false, cursor?: InventoryHistoryEntry) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);

    try {
      const page = await fetchInventoryHistory(filters, PAGE_SIZE, append ? cursor : undefined);
      setHasMore(page.length === PAGE_SIZE);
      setHistory((prev) => (append ? [...prev, ...page] : page));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const groupedHistory = useMemo(() => groupHistoryByDate(history), [history]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || history.length === 0) return;
    const last = history[history.length - 1];
    void load(true, last);
  }, [isLoadingMore, hasMore, history, load]);

  const refresh = useCallback(() => {
    void load(false);
  }, [load]);

  return {
    history,
    groupedHistory,
    filters,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    setFilters,
    loadMore,
    refresh,
  };
}
