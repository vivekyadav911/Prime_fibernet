import { useCallback, useRef, useState } from 'react';

import { cacheSpeedTestResult } from '@/hooks/useLastSpeedTestResult';
import { getEnvConfig } from '@/services/env';
import type { SpeedTestPhase, SpeedTestResult, SpeedTestState } from '@/types/speedTest';

export type { SpeedTestPhase, SpeedTestResult, SpeedTestState } from '@/types/speedTest';

const RANDOM_CHUNK_BYTES = 65_536;

function getSpeedTestUrls() {
  const { supabaseUrl, supabaseAnonKey } = getEnvConfig();
  return {
    pingUrl: `${supabaseUrl}/functions/v1/speedtest-ping`,
    downloadUrl: `${supabaseUrl}/functions/v1/speedtest-download`,
    uploadUrl: `${supabaseUrl}/functions/v1/speedtest-upload`,
    authHeaders: { Authorization: `Bearer ${supabaseAnonKey}` },
  };
}

/** Fill upload payload with incompressible bytes. Web Crypto is unavailable in React Native. */
function fillUploadPayload(buffer: Uint8Array): void {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const chunk = new Uint8Array(RANDOM_CHUNK_BYTES);
    for (let offset = 0; offset < buffer.length; offset += RANDOM_CHUNK_BYTES) {
      globalThis.crypto.getRandomValues(chunk);
      const len = Math.min(RANDOM_CHUNK_BYTES, buffer.length - offset);
      buffer.set(chunk.subarray(0, len), offset);
    }
    return;
  }

  let seed = (Date.now() ^ buffer.length) >>> 0;
  for (let i = 0; i < buffer.length; i++) {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    buffer[i] = seed & 0xff;
  }
}

async function measurePing(): Promise<{ latencyMs: number; server: string }> {
  const { pingUrl, authHeaders } = getSpeedTestUrls();
  const start = performance.now();
  const res = await fetch(pingUrl, {
    method: 'GET',
    headers: authHeaders,
    cache: 'no-store',
  });
  const latencyMs = performance.now() - start;
  if (!res.ok) {
    throw new Error(`Ping failed (${res.status})`);
  }
  const region =
    res.headers.get('x-sb-edge-region') ??
    res.headers.get('x-deno-region') ??
    res.headers.get('x-vercel-id')?.split(':')[0];
  const server = region ? `Supabase Edge (${region})` : 'Supabase Edge (nearest region)';
  return { latencyMs, server };
}

async function measureDownload(
  fileSizeBytes: number,
  onProgress: (mbps: number, progress: number) => void,
): Promise<number> {
  const { downloadUrl, authHeaders } = getSpeedTestUrls();
  const speeds: number[] = [];

  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    const res = await fetch(`${downloadUrl}?size=${fileSizeBytes}`, {
      method: 'GET',
      headers: { ...authHeaders, 'Cache-Control': 'no-store' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }
    const blob = await res.blob();
    const elapsed = (performance.now() - start) / 1000;

    if (blob.size > 0 && elapsed > 0) {
      const mbps = (blob.size * 8) / elapsed / 1_000_000;
      speeds.push(mbps);
      onProgress(mbps, ((i + 1) / 3) * 100);
    }
  }

  if (speeds.length === 0) return 0;
  return speeds.reduce((a, b) => a + b, 0) / speeds.length;
}

async function measureUpload(
  fileSizeBytes: number,
  onProgress: (mbps: number, progress: number) => void,
): Promise<number> {
  const { uploadUrl, authHeaders } = getSpeedTestUrls();
  const speeds: number[] = [];

  for (let i = 0; i < 3; i++) {
    const buffer = new Uint8Array(fileSizeBytes);
    fillUploadPayload(buffer);

    const start = performance.now();
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
      body: buffer,
    });
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }
    const elapsed = (performance.now() - start) / 1000;

    if (elapsed > 0) {
      const mbps = (fileSizeBytes * 8) / elapsed / 1_000_000;
      speeds.push(mbps);
      onProgress(mbps, ((i + 1) / 3) * 100);
    }
  }

  if (speeds.length === 0) return 0;
  return speeds.reduce((a, b) => a + b, 0) / speeds.length;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function stdDev(arr: number[]): number {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.map((x) => (x - avg) ** 2).reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(variance);
}

function chooseSizeForSpeed(planSpeedMbps: number): number {
  if (planSpeedMbps <= 10) return 2_097_152;
  if (planSpeedMbps <= 50) return 5_242_880;
  if (planSpeedMbps <= 100) return 10_485_760;
  return 26_214_400;
}

export function useSpeedTest(planSpeedMbps = 100) {
  const [state, setState] = useState<SpeedTestState>({
    phase: 'idle',
    progress: 0,
    currentSpeed: 0,
    result: null,
    error: null,
  });

  const abortRef = useRef(false);

  const runTest = useCallback(async () => {
    abortRef.current = false;
    setState({ phase: 'ping', progress: 0, currentSpeed: 0, result: null, error: null });

    try {
      const pingTimes: number[] = [];
      let serverLabel = 'Supabase Edge (nearest region)';

      for (let i = 0; i < 5; i++) {
        if (abortRef.current) return;
        const { latencyMs, server } = await measurePing();
        pingTimes.push(latencyMs);
        serverLabel = server;
        setState((s) => ({ ...s, progress: (i + 1) * 8, currentSpeed: 0 }));
      }

      const pingMs = Math.round(median(pingTimes));
      const jitterMs = Math.round(stdDev(pingTimes));

      setState((s) => ({ ...s, phase: 'download', progress: 40, currentSpeed: 0 }));
      if (abortRef.current) return;

      const fileSize = chooseSizeForSpeed(planSpeedMbps);
      const downloadMbps = await measureDownload(fileSize, (mbps, pct) => {
        if (!abortRef.current) {
          setState((s) => ({
            ...s,
            currentSpeed: Math.round(mbps * 10) / 10,
            progress: 40 + pct * 0.3,
          }));
        }
      });

      const uploadSize = Math.round(fileSize * 0.4);
      setState((s) => ({ ...s, phase: 'upload', progress: 70, currentSpeed: 0 }));
      if (abortRef.current) return;

      const uploadMbps = await measureUpload(uploadSize, (mbps, pct) => {
        if (!abortRef.current) {
          setState((s) => ({
            ...s,
            currentSpeed: Math.round(mbps * 10) / 10,
            progress: 70 + pct * 0.3,
          }));
        }
      });

      if (!abortRef.current) {
        const result: SpeedTestResult = {
          ping: pingMs,
          jitter: jitterMs,
          download: Math.round(downloadMbps * 10) / 10,
          upload: Math.round(uploadMbps * 10) / 10,
          server: serverLabel,
          timestamp: new Date(),
        };
        setState({
          phase: 'complete',
          progress: 100,
          currentSpeed: result.download,
          result,
          error: null,
        });
        await cacheSpeedTestResult(result);
      }
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : 'Speed test failed. Check your internet connection.';
        setState((s) => ({
          ...s,
          phase: 'error',
          error: message,
        }));
      }
    }
  }, [planSpeedMbps]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({
      phase: 'idle',
      progress: 0,
      currentSpeed: 0,
      result: null,
      error: null,
    });
  }, []);

  const isRunning = state.phase === 'ping' || state.phase === 'download' || state.phase === 'upload';

  return { state, runTest, reset, isRunning };
}
