#!/usr/bin/env node
/**
 * Open the dev client on a USB-connected Android device at localhost Metro.
 */
import { execSync } from 'node:child_process';
import { defaultPort, findAdb, listAdbDevices, setupAdbReverse } from './lib/expo-connect.mjs';

const DEV_CLIENT_URL = `exp+prime-fibernet-unified://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${defaultPort}`)}`;

function main() {
  const adbPath = findAdb();
  if (!adbPath) {
    console.error('adb not found — install Android platform-tools.');
    process.exit(1);
  }

  const devices = listAdbDevices(adbPath);
  if (devices.length === 0) {
    console.error('No Android device detected. Plug in USB and enable USB debugging.');
    process.exit(1);
  }

  setupAdbReverse(adbPath, defaultPort);
  execSync(`"${adbPath}" shell am force-stop com.primefibernet.app`, { stdio: 'ignore', shell: true });
  console.log(`Opening dev client → http://127.0.0.1:${defaultPort}`);
  execSync(`"${adbPath}" shell am start -a android.intent.action.VIEW -d "${DEV_CLIENT_URL}"`, {
    stdio: 'inherit',
    shell: true,
  });
}

main();
