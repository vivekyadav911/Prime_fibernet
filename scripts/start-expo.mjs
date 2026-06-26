#!/usr/bin/env node
/**
 * LAN / hotspot dev — picks the best PC IP for Expo Go on the same network.
 */
import {
  defaultPort,
  getConnectionMode,
  getLanIp,
  getWindowsNetworkWarnings,
  killPort,
  printHotspotHelp,
  printUsbHelp,
  startExpo,
} from './lib/expo-connect.mjs';

function main() {
  console.log('Stopping stale Metro processes on ports 8081 and 8082...');
  killPort(8081);
  killPort(8082);

  const lanIp = getLanIp();
  const mode = getConnectionMode(lanIp);
  const expoUrl = `exp://${lanIp}:${defaultPort}`;

  const networkWarnings = getWindowsNetworkWarnings();
  if (networkWarnings.length > 0) {
    console.log('');
    console.log('⚠️  NETWORK BLOCK DETECTED');
    for (const warning of networkWarnings) {
      console.log(`   ${warning}`);
    }
    console.log('   Fix: Settings → Wi-Fi → your network → Private, then run scripts/allow-expo-firewall.ps1 as Admin');
  }

  console.log('');
  console.log(`Connection: ${mode}`);
  console.log(`LAN IP:     ${lanIp}`);
  console.log(`Expo URL:   ${expoUrl}`);
  console.log('Mode:       Expo Go (scan QR or enter URL below)');

  if (mode === 'iphone-hotspot' || mode === 'android-hotspot') {
    printHotspotHelp(lanIp, defaultPort);
  } else {
    console.log('');
    console.log('In Expo Go: scan QR code or enter URL manually:', expoUrl);
    console.log('');
  }

  console.log('Other modes:');
  console.log('  Dev client:     pnpm start:dev-client  (native blur — needs custom build)');
  console.log('  USB (Android):  pnpm start:android-usb');
  console.log('  Auto-detect:    pnpm start:auto');
  console.log('  Tunnel (any):   pnpm start:tunnel');
  printUsbHelp(defaultPort);

  startExpo({ mode: 'lan', port: defaultPort, hostname: lanIp });
}

main();
