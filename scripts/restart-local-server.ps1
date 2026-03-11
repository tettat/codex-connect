$old = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -match 'server\.mjs'
}

if ($old) {
  $old | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
}

$logOut = Join-Path $PSScriptRoot '..\local-server.out.log'
$logErr = Join-Path $PSScriptRoot '..\local-server.err.log'

if (Test-Path $logOut) { Remove-Item $logOut -Force }
if (Test-Path $logErr) { Remove-Item $logErr -Force }

Start-Process `
  -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList 'server.mjs' `
  -WorkingDirectory (Join-Path $PSScriptRoot '..') `
  -RedirectStandardOutput $logOut `
  -RedirectStandardError $logErr

Start-Sleep -Seconds 4

Write-Host '--- process ---'
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -match 'server\.mjs'
} | Select-Object ProcessId, CommandLine | Format-List

Write-Host '--- listen ---'
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq 4317 } |
  Select-Object LocalAddress, LocalPort, OwningProcess |
  Format-Table -AutoSize

Write-Host '--- health ---'
curl.exe -sS http://localhost:4317/health

Write-Host "`n--- unauthorized models code ---"
curl.exe -sS -o NUL -w "%{http_code}" http://localhost:4317/v1/models

Write-Host "`n--- stderr ---"
if (Test-Path $logErr) { Get-Content $logErr -Tail 40 }
