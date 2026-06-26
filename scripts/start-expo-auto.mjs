#!/usr/bin/env node
/**
 * Auto-picks USB (adb reverse) when a device is connected, otherwise LAN/hotspot.
 */
import {
  defaultPort,
  findAdb,
  getConnectionMode,
  getLanIp,
  getWindowsNetworkWarnings,
  killPort,
  listAdbDevices,
  printHotspotHelp,
  printUsbHelp,
  setupAdbReverse,
  startExpo,
} from './lib/expo-connect.mjs';

function main() {
  console.log('Stopping stale Metro processes on ports 8081 and 8082...');
  killPort(8081);
  killPort(8082);

  const adbPath = findAdb();
  const devices = adbPath ? listAdbDevices(adbPath) : [];

  if (devices.length > 0) {
    console.log(`USB device detected (${devices.join(', ')}) — using adb reverse mode`);
    console.log(`adb: ${adbPath}`);
    setupAdbReverse(adbPath, defaultPort);
    printUsbHelp(defaultPort);
    startExpo({ mode: 'localhost', port: defaultPort, hostname: '127.0.0.1' });
    return;
  }

  const lanIp = getLanIp();
  const netMode = getConnectionMode(lanIp);
  const expoUrl = `exp://${lanIp}:${defaultPort}`;

  console.log('No USB device — using LAN / hotspot mode');
  console.log(`Connection: ${netMode}`);
  console.log(`Expo URL:   ${expoUrl}`);

  const networkWarnings = getWindowsNetworkWarnings();
  if (networkWarnings.length > 0) {
    console.log('');
    for (const warning of networkWarnings) {
      console.log(`⚠️  ${warning}`);
    }
  }

  if (netMode === 'iphone-hotspot' || netMode === 'android-hotspot') {
    printHotspotHelp(lanIp, defaultPort);
  }

  if (!adbPath) {
    console.log('Tip: for USB fallback, run scripts/setup-android-adb.ps1 once');
  } else if (devices.length === 0) {
    console.log('Tip: plug in USB + enable debugging to auto-switch to USB next time');
  }

  startExpo({ mode: 'lan', port: defaultPort, hostname: lanIp });
}

main();
