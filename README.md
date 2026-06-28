# Messaging App

A full-stack message board app with an ASP.NET Core API and an Expo/React Native client. Users can register or log in with a username and password, create public or private boards, join or request access to boards, invite other users, manage a lightweight profile, exchange text and image messages, and register devices for Expo push notifications.

The project is still development-oriented, but the default backend storage is now SQLite. The original in-memory repositories remain available behind configuration switches for debugging and comparison.

## Project Structure

```text
MessageApplication/
|-- MessagingApp.Api/                       ASP.NET Core backend
|   |-- Controllers/                        Registration, active users, boards, membership, messages
|   |-- Models/                             Active users, boards, messages, message types
|   |-- Persistence/                        EF Core, SQLite startup, repository selection
|   |-- Repositories/                       Board and active-user memory/SQL repositories
|   |-- Requests/                           API request DTOs
|   |-- Responses/                          API response DTOs
|   |-- Services/                           Chat and board business rules
|   |-- Tools/
|   |   |-- AccountPlugin/                  Account/profile models, endpoints, repositories
|   |   |-- ImagePlugin/                    Image upload, metadata, storage, serving
|   |   `-- PushNotificationsPlugin/        Expo push subscription storage and sending
|   |-- appsettings*.json                   Runtime, persistence, beta server config
|   `-- Program.cs                          Service registration and HTTP pipeline
|
|-- MessagingAppClient/                     Expo / React Native frontend
|   |-- src/app/                            Expo Router screens
|   |-- src/APIHandlers/                    API client modules grouped by domain
|   |-- src/components/                     Shared UI and message components
|   |-- src/constants/                      Theme and layout constants
|   |-- src/hooks/                          Session, polling, and API hooks
|   |-- src/plugins/push-notifications/     Expo notification registration
|   |-- src/session/                        AsyncStorage session persistence
|   |-- src/utils/                          Image upload and private chat helpers
|   `-- assets/                             App images and Expo assets
|
|-- docs/                                   Persistence, beta funnel, and planning notes
|-- Build_Run_Api.bat                       Build and start the API
|-- Run_Api_Beta_Funnel.bat                 Start the beta API through Tailscale Funnel
|-- Stop_Api_Beta_Funnel.bat                Stop the beta API/Funnel helper
|-- Run_Client_Test.bat                     Start Expo with a configured packager host
`-- Build_Client.bat                        Run an EAS Android preview build
```

## Current Features

- Username/password registration and login.
- Saved client sessions using AsyncStorage.
- Startup session validation before opening the board list.
- Configurable API server URL from the sign-in screen.
- Public and private message board creation.
- Optional board password protection.
- Unique board IDs for private-board search and joining by code.
- Board list, board detail, join-request, and message polling.
- Text messages and image messages with optional captions.
- Image upload, metadata lookup, owner lookup, download, and deletion.
- Profile data with display name, public blurb, and avatar image.
- Public profile lookup by username.
- Join-request approval and denial workflows.
- Board invitations with accept/reject flows.
- Message deletion by original sender.
- Expo push notification subscription registration and storage.
- Android, iOS, and web support through Expo.
- SQLite-backed persistence by default for active users, accounts, boards, messages, images, and push notification subscriptions.

## Tech Stack

### Backend

- ASP.NET Core targeting .NET 9
- C#
- Controller-based REST API
- EF Core with SQLite
- Repository interfaces with selectable SQL or in-memory implementations
- File-backed image payload storage with SQL-backed image metadata
- Expo push notification client service
- CORS configured to allow any origin, method, and header

### Frontend

- Expo `~56.0.5`
- Expo Router `~56.2.7`
- React Native `0.85.3`
- React `19.2.3`
- TypeScript `~6.0.3`
- Expo Image, Image Picker, Notifications, Symbols, and UI
- `@react-native-async-storage/async-storage`
- Domain-specific API handler modules
- Polling hooks for refresh-based data loading
- EAS build configuration for Android/internal builds

## Prerequisites

- .NET 9 SDK
- Node.js and npm
- Expo Go, an emulator, or a browser for the client
- EAS CLI only for EAS builds
- Tailscale CLI only for the beta Funnel scripts

## Setup

Install and build the API:

```powershell
cd MessagingApp.Api
dotnet restore
dotnet build
```

Install the client dependencies:

```powershell
cd MessagingAppClient
npm install
```

## Running Locally

Start the API:

```powershell
cd MessagingApp.Api
dotnet run
```

By default, the API uses the configured launch profile and SQLite database under `MessagingApp.Api/App_Data`.

Start the client:

```powershell
cd MessagingAppClient
npm start
```

Then choose a target from Expo:

- Press `a` for Android.
- Press `i` for iOS.
- Press `w` for web.
- Scan the QR code with Expo Go for a physical device.

Before logging in, make sure the sign-in screen's Server URL points to the running API. For physical devices, the phone must be able to reach that API address over the network.

## Helper Scripts

```powershell
Build_Run_Api.bat
Run_Api_Beta_Funnel.bat
Stop_Api_Beta_Funnel.bat
Run_Client_Test.bat
Build_Client.bat
```

- `Build_Run_Api.bat` builds and runs the API.
- `Run_Api_Beta_Funnel.bat` configures Tailscale Funnel and starts the API in the `Beta` environment on `http://127.0.0.1:5121`.
- `Run_Api_Beta_Funnel.ps1` can be run directly with or without its optional `-ConfigureFunnel` switch.
- `Stop_Api_Beta_Funnel.bat` stops the hidden beta API runner and can reset Funnel through `-ResetFunnel`.
- `Run_Client_Test.bat` sets `REACT_NATIVE_PACKAGER_HOSTNAME=100.90.53.59` and starts Expo with a cleared cache.
- `Build_Client.bat` runs an EAS Android preview build.

## Configuration

### API

Important API config lives in:

- `MessagingApp.Api/appsettings.json`
- `MessagingApp.Api/appsettings.Development.json`
- `MessagingApp.Api/appsettings.Beta.json`
- `MessagingApp.Api/Properties/launchSettings.json`

Current default storage settings:

```json
{
  "ConnectionStrings": {
    "MessagingAppData": "Data Source=App_Data/messagingapp.sqlite"
  },
  "Persistence": {
    "Provider": "Sqlite",
    "InitializeDatabaseOnStartup": true,
    "FailStartupOnInitializationError": true
  },
  "RepositoryStorage": {
    "ActiveUsers": "Sqlite",
    "MessageBoards": "Sqlite",
    "UserAccounts": "Sqlite",
    "Images": "Sqlite",
    "PushNotifications": "Sqlite"
  },
  "ImageStorage": {
    "ClearStoredImagesOnStartup": false
  }
}
```

Allowed repository storage values are `Sqlite` and `Memory`. If a repository is switched to `Memory`, that area of app state resets when the API process restarts.

The API also exposes:

```text
GET /health
```

The health response includes `status`, `service`, `environment`, and a UTC timestamp.

### Client

Client API host configuration lives in:

```text
MessagingAppClient/src/APIHandlers/Helpers/config.ts
```

The default server URL is currently:

```text
http://100.90.53.59:5121
```

The sign-in screen can save a different Server URL in AsyncStorage. Most API calls resolve their URL through the shared config helper.

### Beta Funnel

The beta API runbook is in:

```text
docs/tailscale-funnel-beta.md
```

Current public Funnel endpoint:

```text
https://desktop-ke30sl9.tail915de.ts.net
```

Current local beta bind URL:

```text
http://127.0.0.1:5121
```

## Persistence Notes

SQLite schema creation happens during API startup. If the database file is missing, the app creates it. If a partial schema exists, startup fails instead of silently continuing with a confusing database shape.

Runtime data that should not be committed:

- SQLite files under `MessagingApp.Api/App_Data`
- Uploaded image files under `MessagingApp.Api/App_Data/images`
- Logs and other generated local files

The in-memory repositories are still useful when comparing behavior during storage changes. See `docs/sql-persistence-reference.md` for the full persistence design and debugging checklist.

## Client Flow

1. `src/app/index.tsx` calls `validateCurrentSession()`.
2. If the saved session is valid, the app opens `Homescreen-Board-Select-Page`.
3. If validation fails, the saved session is cleared and the app opens `Login-Registration-Page`.
4. Registration and login call `/registration` or `/login`, then save the returned `uniqueId` and username.
5. Push notification registration is queued after a successful registration or login when notifications are available.
6. The board screen polls visible public boards and boards the user belongs to.
7. Users can create boards, join visible boards, join protected boards by unique board ID/password, or request access to private boards.
8. The account screen lets users edit profile data, upload an avatar, view invites, accept/reject invites, and sign out.
9. The chat screen polls messages, board details, and join requests.
10. Chat supports text messages, image messages with captions, board member invites, and join-request management.

## API Reference

### Health

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Return basic API health and environment metadata. |

### Registration, Login, and Active Users

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/registration` | Create a user account and active user session. |
| `POST` | `/login` | Authenticate a user and create/refresh an active user session. |
| `POST` | `/anonymous-users` | Create an active user without account data. |
| `GET` | `/active-usernames` | Return all active usernames. |
| `GET` | `/active-users/validate?uniqueId={uniqueId}` | Return whether a user ID is active. |
| `GET` | `/public-profiles` | Return public profile summaries. |
| `GET` | `/public-profiles/{userName}` | Return one public profile by username. |

Registration and login body:

```json
{
  "UserName": "alex",
  "Password": "password-at-least-8-chars"
}
```

Registration and login response:

```json
{
  "userName": "alex",
  "uniqueId": "generated-guid",
  "account": {
    "uniqueId": "generated-guid",
    "displayName": "alex",
    "avatarImageId": null,
    "publicBlurb": null
  }
}
```

### User Accounts

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/user-accounts` | Create account/profile data directly. |
| `GET` | `/user-accounts/{uniqueId}` | Return public account data. |
| `PUT` | `/user-accounts/{uniqueId}/display-name` | Update display name. |
| `PUT` | `/user-accounts/{uniqueId}/public-blurb` | Update public profile text. |
| `PUT` | `/user-accounts/{uniqueId}/avatar` | Update avatar image ID. |

### Message Boards

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/message-boards?uniqueId={uniqueId}` | Return public boards plus boards the user belongs to. |
| `GET` | `/message-boards/{boardId}?uniqueId={uniqueId}` | Return board details if the user belongs to the board. |
| `POST` | `/message-boards` | Create a board and add the creator as a member. |
| `GET` | `/public-boardnames` | Return names of public boards. |

Create board body:

```json
{
  "UniqueId": "user-guid",
  "BoardName": "General",
  "VisibleToPublic": true,
  "PasswordProtected": false,
  "Password": ""
}
```

Board responses include:

```json
{
  "boardId": 1,
  "boardName": "General",
  "visibleToPublic": true,
  "passwordProtected": false,
  "uniqueBoardId": "ABC12345"
}
```

### Board Membership

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/message-boards/{boardId}/join` | Join a board by numeric board ID. |
| `POST` | `/message-boards/search` | Request access by unique board ID. |
| `GET` | `/message-boards/{boardId}/requests?memberUniqueId={uniqueId}` | Return pending requests for a board member. |
| `POST` | `/message-boards/{boardId}/approvals?memberUniqueId={uniqueId}&userName={userName}` | Approve a pending request. |
| `POST` | `/message-boards/{boardId}/denials?memberUniqueId={uniqueId}&userName={userName}` | Deny a pending request. |
| `POST` | `/message-boards/{boardId}/invites?memberUniqueId={uniqueId}&inviteUserName={userName}` | Invite an active user to a board. |
| `GET` | `/active-users/{uniqueId}/invites` | Return board invites for a user. |
| `POST` | `/message-boards/{boardId}/invites/accept?uniqueId={uniqueId}` | Accept an invite and join the board. |
| `POST` | `/message-boards/{boardId}/invites/reject?uniqueId={uniqueId}` | Reject an invite. |
| `POST` | `/message-boards/join-by-code` | Join a password-protected board by unique board ID and password. |

Join body:

```json
{
  "UniqueId": "user-guid",
  "Password": "optional-password"
}
```

Search/request body:

```json
{
  "UniqueBoardId": "ABC12345",
  "UniqueId": "user-guid",
  "Password": "optional-password"
}
```

Join-by-code body:

```json
{
  "UniqueBoardId": "ABC12345",
  "UniqueId": "user-guid",
  "Password": "board-password"
}
```

### Messages

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/message-boards/{boardId}/messages?uniqueId={uniqueId}` | Return messages for a board the user belongs to. |
| `POST` | `/message-boards/{boardId}/messages` | Send a text or image message to a board. |
| `DELETE` | `/message-boards/{boardId}/messages/{messageId}?uniqueId={uniqueId}` | Delete a message if it was sent by the current user. |

Send text message body:

```json
{
  "FromUserName": "alex",
  "ToUserName": "",
  "LocalTimestamp": "2026-06-16T12:00:00.000Z",
  "Content": "Hello!",
  "UniqueId": "user-guid",
  "MessageType": 0,
  "ImageId": null
}
```

Send image message body:

```json
{
  "FromUserName": "alex",
  "ToUserName": "",
  "LocalTimestamp": "2026-06-16T12:00:00.000Z",
  "Content": "Optional caption",
  "UniqueId": "user-guid",
  "MessageType": 1,
  "ImageId": "uploaded-image-id"
}
```

### Images

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/images` | Upload a JPEG, PNG, or WebP image as multipart form data. |
| `GET` | `/images/{imageId}` | Download the image file. |
| `GET` | `/images/{imageId}/metadata` | Return image metadata. |
| `GET` | `/images/owners/{ownerUniqueId}` | Return all image metadata for an owner. |
| `DELETE` | `/images/{imageId}?ownerUniqueId={ownerUniqueId}` | Delete an image owned by the given user. |

Image uploads require form fields:

- `ownerUniqueId`
- `image`

Images are limited to 5 MB and supported content types are JPEG, PNG, and WebP.

### Push Notifications

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/push-notifications/subscriptions` | Create or update an Expo push token subscription. |
| `DELETE` | `/push-notifications/subscriptions?uniqueId={uniqueId}&expoPushToken={token}` | Delete a saved subscription. |

Subscription body:

```json
{
  "UniqueId": "user-guid",
  "ExpoPushToken": "ExponentPushToken[...]",
  "DeviceId": "device-or-session-id",
  "Platform": "android"
}
```

## Useful Commands

Build the API:

```powershell
cd MessagingApp.Api
dotnet build
```

Start the API:

```powershell
cd MessagingApp.Api
dotnet run
```

Start the beta API:

```powershell
.\Run_Api_Beta_Funnel.bat
```

Start the Expo client:

```powershell
cd MessagingAppClient
npm start
```

Run the client linter:

```powershell
cd MessagingAppClient
npm run lint
```

Run an Android preview build through EAS:

```powershell
cd MessagingAppClient
eas build --platform android --profile preview
```

## Documentation

- `docs/sql-persistence-reference.md` explains the repository storage switches, EF Core schema, and migration/debugging approach.
- `docs/sql-persistence-plan.md` tracks persistence migration planning.
- `docs/tailscale-funnel-beta.md` documents the beta Funnel endpoint and operations.
- `docs/github-issue-workplan.md` captures implementation work planning.

## Known Gaps and Risks

- There are no automated tests yet for the API service/controller rules or the client API flows.
- The client uses polling instead of WebSockets or SignalR.
- Authentication is local username/password storage, not a production identity provider.
- Authorization is mostly service-level ownership and membership checks, not a full policy system.
- The API currently allows any CORS origin.
- SQLite is convenient for development and a small beta, but deployment should include backup and file-location planning.
- Uploaded image bytes live on disk, so image backups must include both the SQLite database and image folder.
- Push notification sending depends on Expo push tokens and supported client environments.

## Roadmap

- Add focused automated tests for registration/login, boards, membership, messages, image upload, and push subscription flows.
- Move API host configuration fully out of hardcoded defaults for release builds.
- Add production-grade authentication and authorization.
- Add real-time message delivery with SignalR or another push mechanism.
- Improve board moderation and message deletion behavior.
- Add database backup guidance and deployment configuration examples.
- Continue hardening Android, iOS, and web behavior for invite, profile, image, and protected-board flows.
