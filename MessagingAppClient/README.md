# MessagingAppClient

Expo / React Native client for the Message Board beta.

The live web beta is hosted through Cloudflare at:

```text
https://messageboards.nofuturestudio.com
```

Android preview builds are created with EAS and currently shared privately through Google Drive. The app's default API endpoint is:

```text
https://desktop-ke30sl9.tail915de.ts.net
```

## What This Client Does

- Registers and logs in users with username/password accounts.
- Saves and validates sessions with AsyncStorage.
- Lets users create, join, favorite, and leave boards.
- Supports public boards, private boards, password-protected boards, invites, and join requests.
- Sends text messages and image messages with optional captions.
- Supports profile display names, public blurbs, and avatar images.
- Supports public profile search and one-to-one private chats.
- Registers Expo push notification subscriptions on supported native builds.
- Builds for Android, iOS, and static web from the same Expo project.

## Project Layout

```text
MessagingAppClient/
|-- src/app/                         Expo Router screens
|-- src/APIHandlers/                 API client modules
|-- src/components/                  Shared UI and message components
|-- src/constants/                   Theme and layout constants
|-- src/hooks/                       Session, polling, and API hooks
|-- src/plugins/push-notifications/  Push notification registration
|-- src/session/                     AsyncStorage session persistence
|-- src/utils/                       Image upload and private chat helpers
|-- assets/                          App icons, splash, and UI images
|-- app.json                         Expo app config
|-- eas.json                         EAS build profiles
`-- package.json                     npm scripts and dependencies
```

## Setup

```powershell
npm install
```

## Run Locally

Start the Expo dev server:

```powershell
npm start
```

Then choose a target:

- Press `a` for Android.
- Press `i` for iOS.
- Press `w` for web.
- Scan the QR code with Expo Go for a physical device.

The sign-in screen includes a Server URL field. For normal beta testing, leave it set to `https://desktop-ke30sl9.tail915de.ts.net`. For local development, set it to the reachable URL of your local API.

## Web Build

Build the static web artifact:

```powershell
npm run build:web
```

The output folder is:

```text
web-build
```

Preview the static build locally:

```powershell
npm run serve:web
```

The preview runs at:

```text
http://localhost:8080
```

Deploy the contents of `web-build` to Cloudflare or another static host.

## Android Preview

Build the Android preview artifact:

```powershell
eas build --platform android --profile preview
```

The current beta distribution process is manual private sharing through Google Drive.

## Useful Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Start Expo. |
| `npm run android` | Start Expo for Android. |
| `npm run ios` | Start Expo for iOS. |
| `npm run web` | Start Expo web development mode. |
| `npm run build:web` | Export a static web build to `web-build`. |
| `npm run serve:web` | Serve the static web build on port `8080`. |
| `npm run lint` | Run Expo lint. |

## Configuration

API URL handling lives in:

```text
src/APIHandlers/Helpers/config.ts
```

The app loads a saved Server URL from AsyncStorage and falls back to the default beta API. Most API calls use the shared `apiUrl` helper, so changing the Server URL on the sign-in screen changes the backend used by the client.

Push notification behavior is configured in `app.json` under:

```json
{
  "extra": {
    "pushNotifications": {
      "mode": "auto"
    }
  }
}
```

See the repository root README for the full beta overview, backend setup, and deployment notes.
