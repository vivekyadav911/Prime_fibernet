import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeedTestResult = {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
};

type SpeedTestPhase = 'idle' | 'running' | 'complete';

export function useSimulatedSpeedTest(planSpeedMbps: number) {
  const [phase, setPhase] = useState<SpeedTestPhase>('idle');
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const runTest = useCallback(() => {
    if (planSpeedMbps <= 0) return;

    clearTimer();
    setPhase('running');
    setResult(null);
    setDisplaySpeed(0);

    const targetDownload = Math.max(
      1,
      Math.round(planSpeedMbps * (0.88 + Math.random() * 0.12)),
    );
    const targetUpload = Math.max(1, Math.round(targetDownload * (0.82 + Math.random() * 0.08)));
    const targetPing = Math.round(10 + Math.random() * 14);
    const targetJitter = Math.round(1 + Math.random() * 4);

    let step = 0;
    const totalSteps = 24;

    timerRef.current = setInterval(() => {
      step += 1;
      const progress = step / totalSteps;
      const eased = 1 - (1 - progress) ** 2;
      setDisplaySpeed(Math.round(targetDownload * eased));

      if (step >= totalSteps) {
        clearTimer();
        const finalResult: SpeedTestResult = {
          downloadMbps: targetDownload,
          uploadMbps: targetUpload,
          pingMs: targetPing,
          jitterMs: targetJitter,
        };
        setResult(finalResult);
        setDisplaySpeed(targetDownload);
        setPhase('complete');
      }
    }, 80);
  }, [clearTimer, planSpeedMbps]);

  const reset = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setDisplaySpeed(0);
    setResult(null);
  }, [clearTimer]);

  return {
    phase,
    displaySpeed,
    result,
    runTest,
    reset,
    isRunning: phase === 'running',
  };
}
