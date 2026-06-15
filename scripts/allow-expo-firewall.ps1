# Run once as Administrator to allow Expo Metro through Windows Firewall.
# Right-click PowerShell → Run as administrator, then:
#   cd path\to\Prime_fibernet
#   powershell -ExecutionPolicy Bypass -File scripts\allow-expo-firewall.ps1

$ports = @(8081, 8082, 19000, 19001)

foreach ($port in $ports) {
  $name = "Expo Metro TCP $port"
  $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule already exists: $name"
    continue
  }

  New-NetFirewallRule `
    -DisplayName $name `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $port `
    -Profile Private,Public | Out-Null

  Write-Host "Added firewall rule: $name"
}

Write-Host ""
Write-Host "Done. Restart Expo with: pnpm start"
