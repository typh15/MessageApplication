# Messaging App

A full-stack message board application with an ASP.NET Core API and an Expo/React Native client. Users register a username, create or join message boards, send messages, request access to private boards, and approve pending join requests.

The project is currently development-focused. All API data is stored in memory, so users, boards, requests, invites, and messages are reset whenever the API process restarts.

## Project Structure

```text
MessagingApp/
|-- MessagingApp.Api/          ASP.NET Core backend
|   |-- Controllers/           HTTP endpoints
|   |-- Models/                Active users, message boards, chat messages
|   |-- Repositories/          In-memory data stores
|   |-- Requests/              API request DTOs
|   |-- Responses/             API response DTOs
|   |-- Services/              Chat and board business logic
|   `-- Program.cs             App startup, DI, CORS, controllers
|
|-- MessagingAppClient/        Expo / React Native frontend
|   |-- src/app/               Expo Router screens
|   |-- src/components/        Shared UI and message components
|   |-- src/constants/         Theme constants
|   |-- src/hooks/             Theme and color-scheme hooks
|   |-- src/ApiHandler.tsx     Client API calls and server URL
|   `-- assets/                Images and Expo assets
|
|-- Build_Client.bat           Runs an EAS Android preview build
|-- Build_Run_Api.bat          Builds and starts the API
`-- Run_Client_Test.bat        Starts Expo with the configured host name
```

## Current Features

- Username registration with duplicate-name checks.
- Saved user sessions through `AsyncStorage`.
- Startup validation of saved user IDs before entering the app.
- Public and private message board creation.
- Optional board password protection.
- Unique board IDs for private-board access requests.
- Board list refresh every 5 seconds.
- Chat messages with server timestamps and generated message IDs.
- Chat refresh every 0.5 seconds through polling.
- Join-request workflow for private boards.
- Approval screen for existing board members to approve pending requests.
- Backend support for board invitations and invite accept/reject flows.
- Android, iOS, and web support through Expo.

## Tech Stack

### Backend

- ASP.NET Core targeting `.NET 9`
- C#
- Controller-based API
- Singleton services and repositories
- In-memory data storage
- CORS configured to allow any origin, method, and header during development

### Frontend

- Expo `~56.0.5`
- React Native `0.85.3`
- React `19.2.3`
- TypeScript `~6.0.3`
- Expo Router
- React Native StyleSheet styling
- `@react-native-async-storage/async-storage`
- EAS build configuration for Android/internal builds

## Prerequisites

- .NET 9 SDK
- Node.js and npm
- Expo Go, an emulator, or a browser for running the client
- EAS CLI only if you want to use `Build_Client.bat` or create EAS builds

## Setup

Install and build the API:

```bash
cd MessagingApp.Api
dotnet restore
dotnet build
```

Install the client dependencies:

```bash
cd MessagingAppClient
npm install
```

## Running Locally

Start the API:

```bash
cd MessagingApp.Api
dotnet run
```

The current launch settings bind the API to:

- `http://100.90.53.59:5121`
- `https://100.90.53.59:7060`

The Expo client currently sends requests to `http://100.90.53.59:5121`, defined in `MessagingAppClient/src/ApiHandler.tsx`.

Start the client:

```bash
cd MessagingAppClient
npm start
```

Then choose a target from Expo:

- Press `a` for Android.
- Press `i` for iOS.
- Press `w` for web.
- Scan the QR code with Expo Go for a physical device.

For the existing Windows helper scripts:

```bash
Build_Run_Api.bat
Run_Client_Test.bat
```

`Run_Client_Test.bat` sets `REACT_NATIVE_PACKAGER_HOSTNAME=100.90.53.59` and starts Expo with a cleared cache.

## Network Configuration

The API host is currently hardcoded in two places:

- `MessagingApp.Api/Properties/launchSettings.json`
- `MessagingAppClient/src/ApiHandler.tsx`

If your machine is not reachable at `100.90.53.59`, update both files to use your current local or LAN address. For mobile testing, the device running Expo Go must be able to reach the API host.

The registration screen has a Server URL field, but the active API calls still use the `serverUrl` constant in `ApiHandler.tsx`.

## Client Flow

1. `src/app/index.tsx` checks for a saved `uniqueid`.
2. If the API validates that ID, the app opens the boards screen.
3. If validation fails, the saved ID is cleared and the app opens registration.
4. Registration creates an active user and stores `username` and `uniqueid`.
5. The boards screen lists public boards and boards the user already belongs to.
6. Users can create boards, join accessible boards, or request access by unique board ID.
7. Chat loads board details, shows the unique board ID, polls for messages, and sends new messages.
8. Board members can open the join-request screen and approve pending users.

Because the backend is in memory, a client may keep a saved ID after the API restarts. On the next app startup, validation should remove the stale ID and send the user back to registration.

## API Reference

### Active Users

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/active-users` | Create an active user. |
| `GET` | `/active-usernames` | Return all active usernames. |
| `GET` | `/active-users/validate?uniqueId={uniqueId}` | Return whether a user ID exists in the current API process. |
| `GET` | `/active-users/{uniqueId}/invites` | Return board invites for a user. |

Create user body:

```json
{
  "UserName": "alex"
}
```

Create user response:

```json
{
  "userName": "alex",
  "uniqueId": "generated-guid"
}
```

### Message Boards

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/message-boards?uniqueId={uniqueId}` | Return public boards plus private boards the user belongs to. |
| `GET` | `/message-boards/{boardId}?uniqueId={uniqueId}` | Return board details if the user is active and belongs to the board. |
| `POST` | `/message-boards` | Create a board and add the creator as a member. |
| `POST` | `/message-boards/{boardId}/join` | Join a board by numeric board ID. |
| `POST` | `/message-boards/search` | Request access to a board by unique board ID. |
| `POST` | `/message-boards/join-by-code` | Join a password-protected board by unique board ID and password. |
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

Join board body:

```json
{
  "UniqueId": "user-guid",
  "Password": "optional-password"
}
```

Request access body:

```json
{
  "UniqueBoardId": "ABC12345",
  "UniqueId": "user-guid",
  "Password": "optional-password"
}
```

Join by code body:

```json
{
  "UniqueBoardId": "ABC12345",
  "UniqueId": "user-guid",
  "Password": "board-password"
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

### Messages

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/message-boards/{boardId}/messages?uniqueId={uniqueId}` | Return messages for a board the user belongs to. |
| `POST` | `/message-boards/{boardId}/messages` | Send a message to a board the user belongs to. |
| `DELETE` | `/message-boards/{boardId}/messages/{messageId}` | Delete a message by board-local message ID. |

Send message body:

```json
{
  "FromUserName": "alex",
  "ToUserName": "",
  "LocalTimestamp": "2026-06-10T12:00:00.000Z",
  "Content": "Hello!",
  "UniqueId": "user-guid"
}
```

Send message response:

```json
{
  "uniqueId": "user-guid",
  "message": {
    "id": 1,
    "fromUserName": "alex",
    "boardId": 1,
    "clientTimestamp": "2026-06-10T12:00:00Z",
    "serverTimestamp": "2026-06-10T12:00:01Z",
    "content": "Hello!",
    "globalId": "1-1",
    "hash": 123456789
  }
}
```

### Join Requests and Invites

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/message-boards/{boardId}/requests?memberUniqueId={uniqueId}` | Return pending join requests for a board member. |
| `POST` | `/message-boards/{boardId}/approvals?memberUniqueId={uniqueId}&userName={userName}` | Approve a pending join request. |
| `POST` | `/message-boards/{boardId}/invites?memberUniqueId={uniqueId}&inviteUserName={userName}` | Invite an active user to a board. |
| `POST` | `/message-boards/{boardId}/invites/accept?uniqueId={uniqueId}` | Accept an invite and join the board. |
| `POST` | `/message-boards/{boardId}/invites/reject?uniqueId={uniqueId}` | Reject an invite. |

Join-request responses include:

```json
[
  {
    "userName": "alex",
    "uniqueId": "user-guid"
  }
]
```

Invite responses include:

```json
[
  {
    "boardId": 1,
    "boardName": "General",
    "uniqueBoardId": "ABC12345"
  }
]
```

## Development Notes

- The API registers repositories as singletons, so state is shared for the lifetime of the API process only.
- There is no database, authentication provider, password hashing, authorization policy, or production identity system yet.
- Board passwords are stored as plain text in memory.
- Public board names must be unique, case-insensitively. Private board names are not checked by the same rule.
- The client polls instead of using WebSockets or SignalR.
- The client API layer is centralized in `MessagingAppClient/src/ApiHandler.tsx`.
- The backend has invite endpoints that are not yet wired into the current client UI.
- The root project does not currently include a project-wide license file. `MessagingAppClient/LICENSE` is the Expo template license.

## Useful Commands

Build the API:

```bash
cd MessagingApp.Api
dotnet build
```

Start the API:

```bash
cd MessagingApp.Api
dotnet run
```

Start the Expo client:

```bash
cd MessagingAppClient
npm start
```

Run the client linter:

```bash
cd MessagingAppClient
npm run lint
```

Run an Android preview build through EAS:

```bash
cd MessagingAppClient
eas build --platform android --profile preview
```

## Roadmap

- Replace in-memory repositories with persistent storage.
- Move API host configuration out of hardcoded constants.
- Add proper authentication and authorization.
- Hash board passwords before storing or comparing them.
- Add real-time delivery with SignalR or another push mechanism.
- Finish client UI for board invitations.
- Improve board moderation and message deletion behavior.
- Add automated tests for service rules and client API flows.
