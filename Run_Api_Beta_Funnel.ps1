param(
    [int]$Port = 5121,
    [switch]$ConfigureFunnel
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiProject = Join-Path $root "MessagingApp.Api\MessagingApp.Api.csproj"
$healthUrl = "http://127.0.0.1:$Port/health"

function Test-BetaApiHealth {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
    }
    catch {
        return $false
    }
}

if ($ConfigureFunnel) {
    tailscale funnel --bg --yes $Port
    tailscale funnel status
}

if (Test-BetaApiHealth) {
    Write-Host "MessagingApp.Api beta server is already running at $healthUrl."
    Write-Host "Use Stop_Api_Beta_Funnel.bat first if you want to restart or rebuild it."
    exit 0
}

$env:ASPNETCORE_ENVIRONMENT = "Beta"
$env:ASPNETCORE_URLS = "http://127.0.0.1:$Port"

dotnet build $apiProject

while ($true) {
    Write-Host "Starting MessagingApp.Api beta server on http://127.0.0.1:$Port ..."
    dotnet run --project $apiProject --no-launch-profile --no-build

    $exitCode = $LASTEXITCODE
    Write-Warning "MessagingApp.Api exited with code $exitCode. Restarting in 5 seconds. Press Ctrl+C to stop."
    Start-Sleep -Seconds 5
}
