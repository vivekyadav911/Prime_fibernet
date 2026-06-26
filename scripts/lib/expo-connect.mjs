import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = path.resolve(scriptsDir, '..');
export const appDir = path.join(repoRoot, 'apps', 'unified-app');
export const defaultPort = Number(process.env.EXPO_PORT ?? 8081);

const VIRTUAL_IFACE = /virtual|vmware|hyper-v|vethernet|wsl|loopback|bluetooth|npcap|tap/i;
const HOTSPOT_IP = /^(172\.20\.10\.|192\.168\.43\.|192\.168\.137\.|192\.168\.(\d+)\.)/;

/** Prefer real Wi‑Fi / hotspot client IPs; skip link-local and virtual adapters. */
export function getLanIp() {
  const candidates = [];

  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL_IFACE.test(name)) continue;

    for (const net of entries ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;

      const address = net.address;
      if (address.startsWith('127.') || address.startsWith('169.254.')) continue;

      let score = 0;
      if (HOTSPOT_IP.test(address)) score += 120;
      if (/wi-?fi|wlan|wireless/i.test(name)) score += 80;
      if (/mobile|hotspot|remote ndis|iphone|android/i.test(name)) score += 60;
      if (/ethernet|eth/i.test(name)) score += 40;

      candidates.push({ address, name, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address ?? '127.0.0.1';
}

export function getConnectionMode(lanIp) {
  if (lanIp.startsWith('172.20.10.')) return 'iphone-hotspot';
  if (lanIp.startsWith('192.168.43.') || lanIp.startsWith('192.168.137.')) return 'android-hotspot';
  if (lanIp !== '127.0.0.1') return 'wifi-lan';
  return 'localhost';
}

export function findAdb() {
  const localAdb = path.join(repoRoot, 'tools', 'platform-tools', 'adb.exe');
  if (process.platform === 'win32' && fs.existsSync(localAdb)) return localAdb;

  const envPath = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (envPath) {
    const sdkAdb = path.join(envPath, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
    if (fs.existsSync(sdkAdb)) return sdkAdb;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const studioAdb = path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
    if (fs.existsSync(studioAdb)) return studioAdb;
  }

  try {
    execSync(process.platform === 'win32' ? 'where adb' : 'which adb', { stdio: 'pipe' });
    return 'adb';
  } catch {
    return null;
  }
}

export function listAdbDevices(adbPath) {
  try {
    const out = execSync(`"${adbPath}" devices`, { encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('*'))
      .filter((line) => line.endsWith('\tdevice'))
      .map((line) => line.split('\t')[0]);
  } catch {
    return [];
  }
}

export function setupAdbReverse(adbPath, port = defaultPort) {
  execSync(`"${adbPath}" reverse tcp:${port} tcp:${port}`, { stdio: 'inherit', shell: true });
  execSync(`"${adbPath}" reverse tcp:8082 tcp:8082`, { stdio: 'ignore', shell: true });
}

export function killPort(port) {
  if (process.platform !== 'win32') {
    try {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore', shell: true });
    } catch {
      // Port free.
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
    // Port free.
  }
}

export function getWindowsNetworkWarnings() {
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
          `Network "${profile.Name ?? profile.InterfaceAlias}" is PUBLIC — your phone may be blocked from reaching Metro.`,
        );
      }
    }
    return warnings;
  } catch {
    return [];
  }
}

export function printHotspotHelp(lanIp, port) {
  const mode = getConnectionMode(lanIp);
  console.log('');
  console.log('━━━ PHONE HOTSPOT MODE ━━━');
  console.log(`Your PC IP on the hotspot: ${lanIp}`);
  console.log(`In Expo Go → Enter URL manually: exp://${lanIp}:${port}`);
  console.log('Do NOT use the QR code if it shows a different IP.');
  if (mode === 'iphone-hotspot') {
    console.log('(iPhone hotspot detected — phone gateway is usually 172.20.10.1)');
  }
  console.log('');
  console.log('If it still fails, run as Administrator:');
  console.log('  powershell -ExecutionPolicy Bypass -File scripts/allow-expo-firewall.ps1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

export function printUsbHelp(port) {
  console.log('');
  console.log('━━━ USB MODE (Android) ━━━');
  console.log('1. Phone: Settings → Developer options → USB debugging ON');
  console.log('2. USB mode: File transfer / MTP (not charging-only)');
  console.log('3. Accept the "Allow USB debugging?" prompt on the phone');
  console.log(`4. In Expo Go → Enter URL: exp://127.0.0.1:${port}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

export function startExpo({ mode, port = defaultPort, hostname }) {
  const env = {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
  };

  const flag = mode === 'localhost' ? '--localhost' : mode === 'tunnel' ? '--tunnel' : '--lan';
  const args = `pnpm exec expo start ${flag} --port ${port}`;

  const child = spawn(args, {
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
