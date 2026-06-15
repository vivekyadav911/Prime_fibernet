#!/usr/bin/env node
/**
 * Starts Expo in LAN mode on a single Metro port (default 8081).
 * Stops stale Metro processes first so QR codes always match a live server.
 */
import { spawn, execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.EXPO_PORT ?? 8081);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'apps', 'unified-app');

function getLanIp() {
  const candidates = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const net of entries ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push({ address: net.address, name });
    }
  }
  const wifi = candidates.find((c) => /wi-?fi|wlan|wireless/i.test(c.name));
  return wifi?.address ?? candidates[0]?.address ?? '127.0.0.1';
}

function getWindowsNetworkWarnings() {
  if (process.platform !== 'win32') return [];

  try {
    const raw = execSync(
      'powershell -NoProfile -Command "Get-NetConnectionProfile | Select-Object Name,InterfaceAlias,NetworkCategory | ConvertTo-Json -Compress"',
      { encoding: 'utf8' },
    );
    const profiles = JSON.parse(raw.trim() || '[]');
    const list = Array.isArray(profiles) ? profiles : [profiles];
    const warnings = [];

    for (const profile of list) {
      if (profile.NetworkCategory === 0 || profile.NetworkCategory === 'Public') {
        warnings.push(
          `Wi-Fi "${profile.Name ?? profile.InterfaceAlias}" is PUBLIC — Windows blocks your phone from reaching Metro.`,
        );
      }
    }
    return warnings;
  } catch {
    return [];
  }
}

function killPort(port) {
  if (process.platform !== 'win32') {
    try {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore', shell: true });
    } catch {
      // Port already free.
    }
    return;
  }

  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const match = line.match(/LISTENING\s+(\d+)\s*$/);
      if (match) pids.add(match[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`Freed port ${port} (stopped PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // Port already free.
  }
}

function printConnectionHelp(expoUrl) {
  console.log('');
  console.log('━━━ EXPO GO NOT CONNECTING? DO ONE OF THESE ━━━');
  console.log('');
  console.log('OPTION A — Fix Windows (recommended, 2 minutes)');
  console.log('  1. Settings → Network & Internet → Wi-Fi → your network');
  console.log('  2. Set Network profile to PRIVATE (not Public)');
  console.log('  3. Open PowerShell as Administrator and run:');
  console.log('       powershell -ExecutionPolicy Bypass -File scripts/allow-expo-firewall.ps1');
  console.log('  4. If Windows asks to allow Node.js through the firewall → click Allow');
  console.log('');
  console.log('OPTION B — Phone hotspot (works without admin)');
  console.log('  1. Turn on hotspot on your phone');
  console.log('  2. Connect this PC to the phone hotspot Wi-Fi');
  console.log('  3. Run pnpm start again and scan the new QR code');
  console.log('');
  console.log('OPTION C — Android USB (no Wi-Fi needed)');
  console.log('  1. Enable USB debugging on your phone');
  console.log('  2. Run: pnpm start:android-usb');
  console.log('  3. In Expo Go open: exp://127.0.0.1:8081');
  console.log('');
  console.log('Manual URL in Expo Go:', expoUrl);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

function main() {
  console.log('Stopping stale Metro processes on ports 8081 and 8082...');
  killPort(8081);
  killPort(8082);

  const lanIp = getLanIp();
  const expoUrl = `exp://${lanIp}:${PORT}`;

  const networkWarnings = getWindowsNetworkWarnings();
  if (networkWarnings.length > 0) {
    console.log('');
    console.log('⚠️  NETWORK BLOCK DETECTED');
    for (const warning of networkWarnings) {
      console.log(`   ${warning}`);
    }
  }

  console.log('');
  console.log(`LAN IP:    ${lanIp}`);
  console.log(`Expo URL:  ${expoUrl}`);

  printConnectionHelp(expoUrl);

  const env = {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: lanIp,
  };

  const expoArgs = `pnpm exec expo start --lan --port ${PORT}`;
  const child = spawn(expoArgs, {
    cwd: appDir,
    stdio: 'inherit',
    env,
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
