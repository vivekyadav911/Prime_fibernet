export type SpeedTestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error';

export type SpeedTestResult = {
  ping: number;
  jitter: number;
  download: number;
  upload: number;
  server: string;
  timestamp: Date;
};

export type SpeedTestState = {
  phase: SpeedTestPhase;
  progress: number;
  currentSpeed: number;
  result: SpeedTestResult | null;
  error: string | null;
};
