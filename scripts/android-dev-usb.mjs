#!/usr/bin/env node
/**
 * One-shot Android USB dev: kill stale Metro, adb reverse, start Metro on 8081, open app.
 */
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import {
  appDir,
  defaultPort,
  findAdb,
  killPort,
  listAdbDevices,
  setupAdbReverse,
} from './lib/expo-connect.mjs';

const DEV_CLIENT_URL = `exp+prime-fibernet-unified://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${defaultPort}`)}`;

async function waitForMetro(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`);
      if (response.ok) return true;
    } catch {
      // Metro not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function launchDevClient(adbPath) {
  execSync(`"${adbPath}" shell am start -a android.intent.action.VIEW -d "${DEV_CLIENT_URL}"`, {
    stdio: 'inherit',
    shell: true,
  });
}

async function main() {
  console.log('Stopping stale Metro on ports 8081 and 8082...');
  killPort(defaultPort);
  killPort(8082);

  const adbPath = findAdb();
  if (!adbPath) {
    console.error('adb not found. Install Android platform-tools.');
    process.exit(1);
  }

  const devices = listAdbDevices(adbPath);
  if (devices.length === 0) {
    console.error('No Android device detected. Enable USB debugging and reconnect.');
    process.exit(1);
  }

  setupAdbReverse(adbPath, defaultPort);

  const env = {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
    EXPO_PORT: String(defaultPort),
  };

  const metro = spawn(`pnpm exec expo start --localhost --port ${defaultPort}`, {
    cwd: appDir,
    stdio: 'inherit',
    env,
    shell: true,
  });

  metro.on('error', (error) => {
    console.error('Failed to start Metro:', error.message);
    process.exit(1);
  });

  console.log(`Waiting for Metro on http://127.0.0.1:${defaultPort}...`);
  const ready = await waitForMetro(defaultPort);
  if (!ready) {
    console.error('Metro did not become ready in time.');
    metro.kill('SIGTERM');
    process.exit(1);
  }

  console.log(`Opening Prime Fibernet dev client → http://127.0.0.1:${defaultPort}`);
  execSync(`"${adbPath}" shell am force-stop com.primefibernet.app`, { stdio: 'ignore', shell: true });
  launchDevClient(adbPath);

  metro.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
