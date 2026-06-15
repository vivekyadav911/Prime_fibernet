#!/usr/bin/env node
/**
 * Android USB dev: forwards device localhost:8081 to PC Metro, then starts Expo on localhost.
 * Use when Wi-Fi / LAN cannot reach the PC (common on university networks).
 */
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.EXPO_PORT ?? 8081);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'apps', 'unified-app');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function killPort(port) {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    for (const line of out.split(/\r?\n/)) {
      const match = line.match(/LISTENING\s+(\d+)\s*$/);
      if (match) {
        try {
          execSync(`taskkill /F /PID ${match[1]}`, { stdio: 'ignore' });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Port free.
  }
}

function main() {
  killPort(PORT);
  killPort(8082);

  console.log('Setting up adb reverse (device localhost → PC Metro)...');
  try {
    run(`adb reverse tcp:${PORT} tcp:${PORT}`);
  } catch {
    console.error('');
    console.error('adb failed. Connect your Android phone via USB, enable USB debugging, and try again.');
    process.exit(1);
  }

  console.log('');
  console.log('In Expo Go on your phone, open: exp://127.0.0.1:' + PORT);
  console.log('(adb reverse makes 127.0.0.1 on the phone point to this PC)');
  console.log('');

  const child = spawn(`pnpm exec expo start --localhost --port ${PORT}`, {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (error) => {
    console.error('');
    console.error('Failed to start Expo:', error.message);
    process.exit(1);
  });

  child.on('exit', (code) => process.exit(code ?? 1));
}

main();
