param(
    [switch]$ResetFunnel
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$escapedRoot = $root.Replace("\", "\\")

$processes = Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -match "Run_Api_Beta_Funnel\.ps1" -or
        $_.CommandLine -match "$escapedRoot\\MessagingApp\.Api"
    }

foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

if ($ResetFunnel) {
    tailscale funnel reset
}
