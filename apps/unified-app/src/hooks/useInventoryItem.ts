import { useEffect, useState } from 'react';

import { subscribeToInventoryItem } from '@/services/inventoryService';
import type { InventoryItem } from '@/types/inventory';

export function useInventoryItem(itemId: string) {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToInventoryItem(itemId, (next) => {
      setItem(next);
      setIsLoading(false);
      if (!next) setError('Item not found');
    });

    return unsubscribe;
  }, [itemId]);

  return { item, isLoading, error };
}
