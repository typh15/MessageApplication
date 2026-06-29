# Expo web static hosting

This project's Expo client is configured for a static web export:

```json
"web": {
  "output": "static",
  "favicon": "./assets/images/favicon.png"
}
```

That means production web hosting does not need a long-running Node or Expo app server. Expo builds HTML, JavaScript, CSS, and assets into `MessagingAppClient/web-build`, and a normal static file server can host that folder.

For a different hosting computer, treat `MessagingAppClient/web-build` as the portable artifact. The host computer does not need the repository, Node.js, npm, Expo, .NET, or Android tooling unless you also want to build there.

## Current beta host

The current live beta web app is hosted through Cloudflare at:

```text
https://messageboard.nofuturestudio.com
```

Because the beta uses a dedicated subdomain, the Expo web build can be served from the site root. A root-hosted build does not need the `/messageboards` `baseUrl` setup described later in this document.

## Mental model

- The source computer builds files into `MessagingAppClient/web-build`.
- The host computer serves those built files with any static web server.
- The ASP.NET Core API remains a separate server.
- Browser clients call the API directly using the Server URL saved in the sign-in screen.
- The current default API URL is `https://desktop-ke30sl9.tail915de.ts.net`.
- The API currently allows cross-origin browser requests through CORS.

For HTTPS-hosted web clients, keep the API URL HTTPS too. Browsers usually block HTTPS pages from calling plain HTTP APIs.

## Static server basics

A static web server is a small program that listens for browser requests and sends files from a folder.

For this app, the browser asks for files like:

```text
/
/_expo/static/js/web/entry-abc123.js
/assets/some-image.png
/Login-Registration-Page
```

The static server answers by reading files from the copied `web-build` folder:

```text
/                         -> index.html
/_expo/static/js/...       -> _expo/static/js/...
/assets/...                -> assets/...
/Login-Registration-Page   -> Login-Registration-Page.html
```

The React app does not run on the server. The server only sends HTML, JavaScript, CSS, and image files. After the browser receives those files, the app runs in the user's browser and calls the separate ASP.NET Core API.

## Site root

The site root is the folder the web server treats as `/`.

If the host computer has this folder:

```text
C:\Sites\messagingapp-web
```

then that folder should directly contain:

```text
C:\Sites\messagingapp-web\index.html
C:\Sites\messagingapp-web\Login-Registration-Page.html
C:\Sites\messagingapp-web\_expo\
C:\Sites\messagingapp-web\assets\
```

If `index.html` is accidentally one level deeper, the server root is pointed at the wrong folder.

## Route fallback

Expo Router creates pages such as:

```text
Login-Registration-Page.html
Chat-Page.html
Homescreen-Board-Select-Page.html
```

But browsers commonly request routes without `.html`:

```text
https://your-site.example.com/Login-Registration-Page
```

Without extra server configuration, a plain static server may look for a file literally named `Login-Registration-Page`, fail to find it, and return `404`.

This line in Caddy fixes that:

```text
try_files {path} {path}.html /index.html
```

It means:

1. Try the exact requested file.
2. If that does not exist, try the same path with `.html`.
3. If that still does not exist, send `index.html` so the browser-side app can handle the route.

If the home page loads but refreshing a page like `/Chat-Page` gives a `404`, the route fallback is the first thing to check.

## Local development

Use the Expo development server while editing UI code:

```powershell
cd MessagingAppClient
npm run web
```

This is for development only. It runs Metro and hot reloads the app.

## Build a portable web artifact

Build the static web files:

```powershell
cd MessagingAppClient
npm run build:web
```

The output folder is:

```text
MessagingAppClient/web-build
```

You can copy that folder directly to another computer, or zip it first.

Windows zip example:

```powershell
cd MessagingAppClient
Compress-Archive -Path web-build\* -DestinationPath ..\artifacts\messagingapp-web.zip -Force
```

Linux/macOS zip example:

```bash
cd MessagingAppClient
zip -r ../artifacts/messagingapp-web.zip web-build
```

## Production-style local preview

Preview before copying the artifact:

```powershell
cd MessagingAppClient
npm run serve:web
```

Then open:

```text
http://localhost:8080
```

This preview command is only for checking the export on a development computer. It is not required on the real host.

## Hosting on another computer

Copy the contents of this folder to the host:

```text
MessagingAppClient/web-build
```

Do not copy the parent folder if your server expects the site root to contain `index.html`. The hosted directory should contain files like:

```text
index.html
Login-Registration-Page.html
_expo/
assets/
```

For a first self-hosted setup, use Caddy unless you already know nginx or IIS. Caddy is a single static server, has a small config file, and can handle HTTPS automatically when you have a real domain pointed at the host.

Good beta-friendly hosting options:

- EAS Hosting
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages
- A small VPS or Windows machine running Caddy, nginx, IIS, or another static file server

If you use a generic static server, configure route fallback or extensionless HTML lookup so routes like `/Login-Registration-Page` work.

The only machine-specific values in the examples below are the domain name, the folder path, and the port.

## Cloudflare Workers upload

In Cloudflare's upload form, `Assets directory` means "which folder in this upload should Cloudflare serve as the static website root." It does not mean the Expo-generated `assets/` image folder.

For this project, first build:

```powershell
cd MessagingAppClient
npm run build:web
```

Then upload the generated site files from:

```text
MessagingAppClient/web-build
```

Recommended dashboard settings:

```text
Assets directory: /
HTML handling: auto-trailing-slash
Not found handling: single-page-application
```

Use `Assets directory: /` when the uploaded root directly contains:

```text
index.html
Login-Registration-Page.html
_expo/
assets/
```

If the uploaded root contains a `web-build` folder, and `index.html` is inside that folder, then set:

```text
Assets directory: /web-build
```

Do not set `Assets directory` to `/assets`. That would make Cloudflare start inside the image/static-subfolder instead of the actual website root, and it would not find `index.html`.

`HTML handling: auto-trailing-slash` lets Cloudflare serve `Login-Registration-Page.html` when the browser visits `/Login-Registration-Page`.

`Not found handling: single-page-application` makes Cloudflare serve `index.html` when a browser navigation request does not match a file. This is useful for client-side app routes and is Cloudflare's recommended mode for single-page applications.

## Cloudflare at /messageboards alternate path setup

The current beta uses `https://messageboard.nofuturestudio.com`. This section is for an alternate deployment where the app lives under a path such as `/messageboards` on an existing domain.

Do not use `Assets directory: /messageboards` just because the public URL should be `/messageboards`. `Assets directory` chooses a folder inside the uploaded files. It does not choose the public URL path.

For a no-code Cloudflare Workers static-assets deployment at:

```text
https://nofuturestudio.com/messageboards
```

you need three things to agree:

1. Cloudflare routes `/messageboards` traffic to the Worker.
2. Expo builds asset URLs that start with `/messageboards`.
3. The uploaded file tree contains a top-level `messageboards` folder.

Add this to `MessagingAppClient/app.json` before building a `/messageboards` web deployment:

```json
"experiments": {
  "baseUrl": "/messageboards",
  "typedRoutes": true,
  "reactCompiler": true
}
```

Then build:

```powershell
cd MessagingAppClient
npm run build:web
```

Create an upload folder shaped like this:

```text
cloudflare-upload/
  messageboards/
    index.html
    Login-Registration-Page.html
    _expo/
    assets/
    favicon.ico
```

The contents of `MessagingAppClient/web-build` go inside `cloudflare-upload/messageboards`.

Then use these Cloudflare settings:

```text
Assets directory: /
HTML handling: auto-trailing-slash
Not found handling: single-page-application
```

In the Worker's domains/routes settings, route the Worker at:

```text
nofuturestudio.com/messageboards*
```

That route is what makes the public URL start at `/messageboards`. The nested `messageboards` folder is what lets requests like `/messageboards/_expo/static/...` find the real files.

If you leave Expo's `baseUrl` unset, the exported HTML will reference root-level files like `/_expo/static/...`. That is fine for `https://nofuturestudio.com/`, but it is usually wrong for `https://nofuturestudio.com/messageboards`.

### If Cloudflare flattens the upload

Some Cloudflare dashboard upload flows flatten the selected folder and upload only the folder contents. In that case, the uploaded files end up like this:

```text
/
  index.html
  _expo/
  assets/
```

instead of this:

```text
/
  messageboards/
    index.html
    _expo/
    assets/
```

If that happens, keep the flattened upload and add a small Worker rewrite. The browser still visits `/messageboards`, but the Worker internally asks the static asset binding for `/index.html`, `/_expo/...`, and `/assets/...`.

Keep `baseUrl` in `app.json`:

```json
"experiments": {
  "baseUrl": "/messageboards",
  "typedRoutes": true,
  "reactCompiler": true
}
```

Upload the flattened `web-build` contents with:

```text
Assets directory: /
HTML handling: auto-trailing-slash
Not found handling: single-page-application
```

If the Cloudflare dashboard upload flow does not show an editor named something like `Edit code`, `Quick edit`, `Code`, or `Worker editor`, use Wrangler instead. This repo includes a ready-to-deploy config:

```text
MessagingAppClient/wrangler.messageboards.jsonc
MessagingAppClient/cloudflare/messageboards-worker.js
```

Build and deploy from `MessagingAppClient`:

```powershell
npm run build:web
npm run deploy:cloudflare:messageboards
```

The Wrangler config binds `web-build` as `ASSETS`, routes `nofuturestudio.com/messageboards*`, and runs the Worker rewrite before static assets.

The Worker code is:

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      url.pathname = "/messageboards";
      return Response.redirect(url.toString(), 302);
    }

    if (url.pathname === "/messageboards") {
      url.pathname = "/";
    } else if (url.pathname.startsWith("/messageboards/")) {
      url.pathname = url.pathname.slice("/messageboards".length);
    } else {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(new Request(url, request));
  },
};
```

Route the Worker at:

```text
nofuturestudio.com/messageboards*
```

With this rewrite, these public URLs:

```text
/messageboards
/messageboards/_expo/static/js/...
/messageboards/assets/...
```

are served from these uploaded files:

```text
/index.html
/_expo/static/js/...
/assets/...
```

Troubleshooting:

- If `https://nofuturestudio.com` is blank but its HTML references `/messageboards/_expo/...`, Expo's `baseUrl` is active.
- If `https://nofuturestudio.com/messageboards` returns `404`, the uploaded files probably do not contain `messageboards/index.html`.
- If `https://nofuturestudio.com/messageboards/_expo/static/...` returns `404`, the uploaded files probably do not contain `messageboards/_expo/static/...`.

That usually means one of these happened:

- `web-build` was uploaded directly instead of being copied into a top-level `messageboards` folder first.
- The inner `messageboards` folder was selected in the upload picker instead of the parent folder.
- `Assets directory` was set to `/messageboards`, which makes Cloudflare serve the `messageboards` folder as `/` instead of preserving `/messageboards` in the public URL.

For the nested-folder approach, keep:

```text
Assets directory: /
```

## Recommended first host: Caddy

On the host computer:

1. Install or download Caddy.
2. Create a folder for the site, such as `C:\Sites\messagingapp-web`.
3. Copy the contents of `web-build` into that folder.
4. Create a `Caddyfile` next to Caddy or in a folder you will run Caddy from.
5. Start Caddy.
6. Open the host URL in a browser.

For a private LAN test without a domain, use port `8080`:

```text
:8080 {
  root * C:\Sites\messagingapp-web
  try_files {path} {path}.html /index.html
  file_server
}
```

Run Caddy from the folder containing that `Caddyfile`:

```powershell
caddy run
```

Open this on the host computer:

```text
http://localhost:8080
```

Open this from another device on the same network:

```text
http://host-computer-ip:8080
```

For a public site, point a domain name at the host computer and use the domain in the Caddyfile:

```text
your-domain.example.com {
  root * C:\Sites\messagingapp-web
  try_files {path} {path}.html /index.html
  file_server
}
```

Then open:

```text
https://your-domain.example.com
```

For public hosting from a home or office network, the host must be reachable from the internet. That usually means DNS points to the public IP, the router forwards ports `80` and `443` to the host, and the OS firewall allows Caddy.

## nginx example

Linux host path example:

```nginx
location / {
    root /var/www/messagingapp-client/web-build;
    try_files $uri $uri.html $uri/ /index.html;
}
```

With nginx, TLS usually lives in the surrounding `server` block or a companion tool such as certbot.

## IIS notes

For IIS on Windows:

- Point the site root at the copied web-build contents, such as `C:\Sites\messagingapp-web`.
- Enable static content serving.
- Add URL Rewrite or an equivalent fallback rule so extensionless paths can resolve to `{path}.html` or `/index.html`.
- Bind HTTPS with a certificate if the site is public.

## Backend API

For the current beta setup, start the backend through the existing Funnel helper:

```powershell
.\Run_Api_Beta_Funnel.bat
```

Health check:

```powershell
curl.exe https://desktop-ke30sl9.tail915de.ts.net/health
```

The web login screen should show this Server URL by default:

```text
https://desktop-ke30sl9.tail915de.ts.net
```

## Deployment checklist

1. Start or verify the API Funnel.
2. Confirm `https://desktop-ke30sl9.tail915de.ts.net/health` returns OK.
3. Run `npm run build:web`.
4. Copy the contents of `MessagingAppClient/web-build` to the host computer.
5. Configure the host's static server to use that copied folder as the site root.
6. Configure fallback or extensionless route handling.
7. Open the hosted web app.
8. Confirm the Server URL field is HTTPS.
9. Register or log in from the browser.
