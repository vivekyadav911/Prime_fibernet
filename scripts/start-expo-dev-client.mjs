#!/usr/bin/env node
/**
 * Dev client mode — for native blur and custom native modules (not Expo Go).
 */
import {
  defaultPort,
  getConnectionMode,
  getLanIp,
  killPort,
  startExpo,
} from './lib/expo-connect.mjs';

function main() {
  console.log('Stopping stale Metro processes on ports 8081 and 8082...');
  killPort(8081);
  killPort(8082);

  const lanIp = getLanIp();
  const mode = getConnectionMode(lanIp);

  console.log('');
  console.log(`Connection: ${mode}`);
  console.log(`LAN IP:     ${lanIp}`);
  console.log('Mode:       development build (install dev client on device first)');
  console.log('');

  startExpo({ mode: 'lan', port: defaultPort, hostname: lanIp, go: false });
}

main();
