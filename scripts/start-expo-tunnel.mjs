#!/usr/bin/env node
/**
 * Tunnel mode — works on any network (university Wi-Fi, no LAN, etc.).
 * Slower than LAN/USB but reliable when nothing else connects.
 */
import { defaultPort, killPort, startExpo } from './lib/expo-connect.mjs';

function main() {
  console.log('Stopping stale Metro processes on ports 8081 and 8082...');
  killPort(8081);
  killPort(8082);

  console.log('');
  console.log('Starting Expo in TUNNEL mode (works on any network)...');
  console.log('Scan the QR code in the terminal when Metro is ready.');
  console.log('First launch may take 30–60 seconds.');
  console.log('');

  startExpo({ mode: 'tunnel', port: defaultPort, hostname: 'localhost' });
}

main();
