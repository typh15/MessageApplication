param(
    [int]$Port = 5121,
    [switch]$ConfigureFunnel
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiProject = Join-Path $root "MessagingApp.Api\MessagingApp.Api.csproj"

if ($ConfigureFunnel) {
    tailscale funnel --bg --yes $Port
    tailscale funnel status
}

$env:ASPNETCORE_ENVIRONMENT = "Beta"
$env:ASPNETCORE_URLS = "http://127.0.0.1:$Port"

while ($true) {
    Write-Host "Starting MessagingApp.Api beta server on http://127.0.0.1:$Port ..."
    dotnet run --project $apiProject --no-launch-profile

    $exitCode = $LASTEXITCODE
    Write-Warning "MessagingApp.Api exited with code $exitCode. Restarting in 5 seconds. Press Ctrl+C to stop."
    Start-Sleep -Seconds 5
}
