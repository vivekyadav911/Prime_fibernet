import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { SpeedTestResult } from '@/types/speedTest';

const CACHE_KEY = '@prime/last_speed_test_result_v1';

const listeners = new Set<() => void>();

type CachedSpeedTestResult = Omit<SpeedTestResult, 'timestamp'> & { timestamp: string };

async function readCachedResult(): Promise<SpeedTestResult | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSpeedTestResult;
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp),
    };
  } catch {
    return null;
  }
}

export async function cacheSpeedTestResult(result: SpeedTestResult): Promise<void> {
  const payload: CachedSpeedTestResult = {
    ...result,
    timestamp: result.timestamp.toISOString(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  listeners.forEach((listener) => listener());
}

export function useLastSpeedTestResult() {
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const cached = await readCachedResult();
    setResult(cached);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let active = true;
    const listener = () => {
      void readCachedResult().then((cached) => {
        if (active) setResult(cached);
      });
    };

    void readCachedResult().then((cached) => {
      if (active) {
        setResult(cached);
        setLoaded(true);
      }
    });

    listeners.add(listener);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  return { result, loaded, reload };
}
