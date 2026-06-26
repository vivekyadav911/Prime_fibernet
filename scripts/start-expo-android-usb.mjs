#!/usr/bin/env node
/**
 * Android USB dev: adb reverse + Expo on localhost.
 * Requires adb — run scripts/setup-android-adb.ps1 once if missing.
 */
import {
  defaultPort,
  findAdb,
  killPort,
  listAdbDevices,
  printUsbHelp,
  setupAdbReverse,
  startExpo,
} from './lib/expo-connect.mjs';

function main() {
  killPort(defaultPort);
  killPort(8082);

  const adbPath = findAdb();
  if (!adbPath) {
    console.error('');
    console.error('adb not found. USB mode needs Android platform-tools.');
    console.error('');
    console.error('Run once (downloads ~15 MB):');
    console.error('  powershell -ExecutionPolicy Bypass -File scripts/setup-android-adb.ps1');
    console.error('');
    console.error('Or install Android Studio SDK platform-tools and add adb to PATH.');
    console.error('');
    console.error('For hotspot without USB, use: pnpm start');
    process.exit(1);
  }

  console.log(`Using adb: ${adbPath}`);

  const devices = listAdbDevices(adbPath);
  if (devices.length === 0) {
    console.error('');
    console.error('No Android device detected.');
    console.error('');
    console.error('Checklist:');
    console.error('  • USB-C cable connected (data-capable, not charge-only)');
    console.error('  • Developer options → USB debugging ON');
    console.error('  • USB mode: File transfer / MTP');
    console.error('  • Tap "Allow" on the USB debugging prompt on the phone');
    console.error('  • Try another USB port or cable');
    console.error('');
    console.error('Run to diagnose:');
    console.error(`  "${adbPath}" devices`);
    console.error('');
    console.error('For hotspot without USB, use: pnpm start');
    process.exit(1);
  }

  console.log(`Device(s): ${devices.join(', ')}`);
  console.log('Setting up adb reverse (phone localhost → PC Metro)...');

  try {
    setupAdbReverse(adbPath, defaultPort);
  } catch (error) {
    console.error('');
    console.error('adb reverse failed:', error.message);
    process.exit(1);
  }

  printUsbHelp(defaultPort);
  startExpo({ mode: 'localhost', port: defaultPort, hostname: '127.0.0.1' });
}

main();
