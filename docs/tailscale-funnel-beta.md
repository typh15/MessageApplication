# Tailscale Funnel beta API

This machine is configured for the beta API endpoint:

```text
https://desktop-ke30sl9.tail915de.ts.net
```

The public Funnel forwards HTTPS traffic to the API running locally on:

```text
http://127.0.0.1:5121
```

If Tailscale reports that Funnel is not enabled on the tailnet, enable it here:

```text
https://login.tailscale.com/f/funnel?node=n7JraYMv6B11CNTRL
```

Then run:

```powershell
tailscale funnel --bg --yes 5121
```

## Start the beta server

From the repository root:

```powershell
.\Run_Api_Beta_Funnel.bat
```

The script:

- starts Tailscale Funnel in the background for port `5121`
- exits early if the beta API is already healthy
- runs the API with `ASPNETCORE_ENVIRONMENT=Beta`
- binds Kestrel to `http://127.0.0.1:5121`
- restarts the API after a crash until the terminal is closed

If you need to rebuild after code changes, stop the running beta API first.

## Stop the beta server

```powershell
.\Stop_Api_Beta_Funnel.bat
```

To also clear the public Funnel mapping:

```powershell
.\Stop_Api_Beta_Funnel.bat -ResetFunnel
```

## Health check

```powershell
curl.exe https://desktop-ke30sl9.tail915de.ts.net/health
```

## Useful Tailscale commands

```powershell
tailscale funnel status
tailscale funnel reset
tailscale serve status
```

## Client URL

Use this server URL from the Expo registration screen:

```text
https://desktop-ke30sl9.tail915de.ts.net
```

The beta API uses `MessagingApp.Api/appsettings.Beta.json`, which keeps SQLite and stored images persistent across API restarts.
