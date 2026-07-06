# Chatbot development and deployment flow

The chatbot integration is backend-only. Existing clients keep using the same message-board APIs and can invite the configured bot username into a board.

There are two different URL concerns:

| Setting | Purpose | Typical value |
| --- | --- | --- |
| `Chatbot:BaseUrl` | URL `MessagingApp.Api` uses to call `ChatbotInterfaceAPI` | `http://127.0.0.1:8000` when both APIs run on the same machine |
| `Chatbot:PublicImageBaseUrl` | Public HTTPS origin the LLM can fetch image URLs from | The Tailscale Funnel URL for the machine hosting `MessagingApp.Api` |

Do not commit a temporary development laptop Funnel URL into `appsettings.Beta.json`. Supply the public image URL as an environment variable or script argument on the machine that is actually hosting Beta. Image chatbot requests prefer inline Base64 image data, so OpenAI does not have to fetch beta images over the public internet. If inline image data cannot be created, `MessagingApp.Api` can fall back to `Chatbot:PublicImageBaseUrl` or an inferred HTTPS request origin.

## Development flow

Use this for local text/image smoke tests on a development computer.

1. Start `ChatbotInterfaceAPI`:

   ```powershell
   # From the ChatbotInterfaceAPI project
   # It should listen on http://127.0.0.1:8000
   ```

2. Start `MessagingApp.Api` with chatbot enabled for this terminal only:

   ```powershell
   $env:ASPNETCORE_ENVIRONMENT = "Development"
   $env:ASPNETCORE_URLS = "http://127.0.0.1:5122"
   $env:Chatbot__Enabled = "true"
   $env:Chatbot__BaseUrl = "http://127.0.0.1:8000"
   dotnet run --project .\MessagingApp.Api\MessagingApp.Api.csproj --no-launch-profile
   ```

3. Invite `Chatbot` into a board by username, then send a text message.

4. For image-message testing, stop `MessagingApp.Api`, expose the development API through Funnel, set the public URL, then start the API again:

   ```powershell
   tailscale funnel --bg --yes 5122
   $env:Chatbot__PublicImageBaseUrl = "https://your-dev-machine.tailnet.ts.net"
   dotnet run --project .\MessagingApp.Api\MessagingApp.Api.csproj --no-launch-profile
   ```

   OpenAI cannot fetch `localhost` image URLs, so image tests need the public HTTPS origin.

## Deployment flow

Use this on the desktop that hosts the Beta API.

1. Start `ChatbotInterfaceAPI` on the desktop:

   ```powershell
   # It should listen on http://127.0.0.1:8000
   ```

2. Start the Beta API and pass the desktop Funnel URL:

   ```powershell
   .\Run_Api_Beta_Funnel.bat -PublicImageBaseUrl "https://your-desktop.tailnet.ts.net"
   ```

   The batch file runs `Run_Api_Beta_Funnel.ps1`, configures Funnel for port `5121`, runs the API with `ASPNETCORE_ENVIRONMENT=Beta`, and binds Kestrel to `http://127.0.0.1:5121`.

3. If `ChatbotInterfaceAPI` is not on the same desktop, also pass its URL:

   ```powershell
   .\Run_Api_Beta_Funnel.bat `
     -PublicImageBaseUrl "https://your-desktop.tailnet.ts.net" `
     -ChatbotBaseUrl "http://chatbot-host:8000"
   ```

4. Verify the public API:

   ```powershell
   curl.exe https://your-desktop.tailnet.ts.net/health
   ```

5. Existing clients do not need an update. Users can invite `Chatbot` into a board from the existing invite UI.

## Persistent deployment variables

Instead of passing script arguments each time, set environment variables on the desktop:

```powershell
[Environment]::SetEnvironmentVariable("Chatbot__PublicImageBaseUrl", "https://your-desktop.tailnet.ts.net", "User")
[Environment]::SetEnvironmentVariable("Chatbot__BaseUrl", "http://127.0.0.1:8000", "User")
```

Open a fresh terminal after setting persistent variables.

## Expected behavior

- Text messages to boards containing `Chatbot` produce bot replies.
- Image messages send inline Base64 image data to `ChatbotInterfaceAPI`, which then passes it to OpenAI as an image data URL.
- If inline image data cannot be loaded, the API falls back to `{Chatbot:PublicImageBaseUrl}/images/{imageId}` or an inferred public HTTPS request origin.
- If no image input can be created, text chat still works and the API logs a warning for image messages.
- Bot messages do not trigger another chatbot reply.
- Recent messages and stored summaries are included by the backend.
