# Downloads Android platform-tools (adb) into tools/platform-tools for USB Expo dev.
# Run from repo root: powershell -ExecutionPolicy Bypass -File scripts/setup-android-adb.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path $root 'tools\platform-tools'
$zip = Join-Path $env:TEMP 'platform-tools-latest-windows.zip'
$url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

Write-Host 'Downloading Android platform-tools (adb)...'
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

if (Test-Path $dest) {
  Remove-Item -Recurse -Force $dest
}

$toolsDir = Join-Path $root 'tools'
if (-not (Test-Path $toolsDir)) {
  New-Item -ItemType Directory -Path $toolsDir | Out-Null
}

$extractRoot = Join-Path $env:TEMP 'platform-tools-extract'
if (Test-Path $extractRoot) {
  Remove-Item -Recurse -Force $extractRoot
}
New-Item -ItemType Directory -Path $extractRoot | Out-Null
Expand-Archive -Path $zip -DestinationPath $extractRoot -Force

$extracted = Join-Path $extractRoot 'platform-tools'
if (-not (Test-Path $extracted)) {
  throw "Expected folder not found after extract: $extracted"
}

if (Test-Path $dest) {
  Remove-Item -Recurse -Force $dest
}
Move-Item $extracted $dest

Remove-Item $zip -Force -ErrorAction SilentlyContinue
Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue

$adb = Join-Path $dest 'adb.exe'
Write-Host ''
Write-Host "Installed: $adb"
Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Enable USB debugging on your Android phone'
Write-Host '  2. Connect via USB-C'
Write-Host '  3. Run: pnpm start:android-usb'
