# Messaging App

A full-stack message board application with an ASP.NET Core API and an Expo/React Native client. Users can register a session, create and join boards, request access to private boards, invite other users, manage a lightweight profile, and exchange text or image messages through a polling-based chat UI.

This project is still development-focused. Most application state is stored in singleton, in-memory repositories, so users, accounts, boards, memberships, requests, invites, and messages reset when the API restarts. Uploaded images are written under `MessagingApp.Api/App_Data/images`, but that folder is cleared when the API starts as the in-memory repository has the metadata needed to reference the saved images.

## Project Structure

```text
MessagingApp/
|-- MessagingApp.Api/                       ASP.NET Core backend
|   |-- Controllers/                        Registration, users, boards, membership, messages
|   |-- Models/                             Active users, boards, messages, message types
|   |-- Repositories/                       In-memory repositories
|   |-- Requests/                           API request DTOs
|   |-- Responses/                          API response DTOs
|   |-- Services/                           Chat and board business logic
|   |-- Tools/
|   |   |-- AccountPlugin/                  User account/profile endpoints and storage
|   |   `-- ImagePlugin/                    Image upload, metadata, and file serving
|   `-- Program.cs                          Dependency injection, CORS, controllers
|
|-- MessagingAppClient/                     Expo / React Native frontend
|   |-- src/app/                            Expo Router screens
|   |-- src/APIHandlers/                    API client functions grouped by domain
|   |-- src/hooks/API/                      Polling hooks for boards, messages, requests
|   |-- src/session/                        AsyncStorage-backed session helpers
|   |-- src/components/                     Shared UI and message components
|   |-- src/constants/                      Theme constants
|   `-- assets/                             Images and Expo assets
|
|-- Build_Client.bat                        Runs an EAS Android preview build
|-- Build_Run_Api.bat                       Builds and starts the API
`-- Run_Client_Test.bat                     Starts Expo with the configured host name
```

## Current Features

- User registration through `/registration`, which creates both an active user and account record.
- Optional anonymous active-user creation through `/anonymous-users`.
- Saved client sessions using `AsyncStorage` keys for `uniqueid` and `username`.
- Startup session validation before entering the board list.
- Public and private message board creation.
- Optional board password protection.
- Unique board IDs for requesting access to private boards.
- Password-based private-board joining by unique board ID.
- Board list polling every 5 seconds.
- Board detail and join-request polling every 5 seconds.
- Message polling every 500 ms.
- Text and image message sending with server timestamps and board-local/global message IDs.
- Image upload, image preview, and image rendering in chat.
- Message deletion endpoint that only allows the original sender to delete their message.
- Join-request approval workflow for current board members.
- Board invites from the chat screen.
- Invite accept/decline flows from the account screen.
- Account screen for display name, public blurb, profile image, invites, and sign out.
- Android, iOS, and web support through Expo.

## Functional But Needs More Testing

- Invite creation, invite accept/decline, and password-based board joining are wired into the client and API, but still need broader manual testing across Android, iOS, and web.
- Join-request approval is backed by the API. Denying a join request currently dismisses it in the client view; there is not a matching backend endpoint that permanently rejects/removes the request.
- The Server URL field on the registration screen saves a value, but active API calls use the hardcoded client config value.
- There are no automated tests yet for the newer account, invite, image upload, or image-message flows.

## Tech Stack

### Backend

- ASP.NET Core targeting `.NET 9`
- C#
- Controller-based REST API
- Dependency injection with singleton services and repositories
- DTOs for requests and responses
- In-memory repositories for development storage
- File-backed image payload storage that is cleared at API startup
- CORS configured to allow any origin, method, and header

### Frontend

- Expo `~56.0.5`
- React Native `0.85.3`
- React `19.2.3`
- TypeScript `~6.0.3`
- Expo Router
- Expo Image
- Expo Image Picker
- Expo Symbols
- React Native StyleSheet styling
- `@react-native-async-storage/async-storage`
- Domain-specific API handler modules
- Reusable polling hook for refresh-based data loading
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

The existing helper scripts are:

```bash
Build_Run_Api.bat
Run_Client_Test.bat
Build_Client.bat
```

- `Build_Run_Api.bat` builds and runs the API.
- `Run_Client_Test.bat` sets `REACT_NATIVE_PACKAGER_HOSTNAME=100.90.53.59` and starts Expo with a cleared cache.
- `Build_Client.bat` runs an EAS Android preview build.

## Network Configuration

The API and client both use hardcoded development host values right now.

API launch settings:

- `MessagingApp.Api/Properties/launchSettings.json`
- Current HTTP URL: `http://100.90.53.59:5121`
- Current HTTPS URL: `https://100.90.53.59:7060`

Client API config:

- `MessagingAppClient/src/APIHandlers/Helpers/config.ts`
- Current client URL: `http://100.93.130.74:5121`

Before running the full app, make sure the client URL points to the same reachable host and port as the API. For physical-device testing, the phone running Expo Go must be able to reach that API address over the local network.

## Client Flow

1. `src/app/index.tsx` calls `validateCurrentSession()`.
2. If the saved session is valid, the app opens `Homescreen-Board-Select-Page`.
3. If validation fails, the saved session is cleared and the app opens `Login-Registration-Page`.
4. Registration calls `/registration` and stores the returned `uniqueId` and username.
5. The board screen uses `useBoards()` to poll available public boards and boards the user belongs to.
6. Users can create boards, join visible boards, join protected boards by unique board ID and password, or request private-board access by unique board ID.
7. The board screen links to `Account-Page`, where users can edit profile data, upload a profile image, view invites, accept/decline invites, and sign out.
8. `Chat-Page` uses polling hooks for messages, board details, and join requests.
9. Chat supports text messages, image messages with optional captions, board member invites, and a join-request button when pending requests exist.
10. `Board-Join-Requests-Page` lets board members approve pending requests.

## API Reference

### Registration and Active Users

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/registration` | Create a user account and active user together. |
| `POST` | `/anonymous-users` | Create an active user without account data. |
| `GET` | `/active-usernames` | Return all active usernames. |
| `GET` | `/active-users/validate?uniqueId={uniqueId}` | Return whether a user ID exists in the current API process. |

Registration body:

```json
{
  "UserName": "alex"
}
```

Registration response:

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

Request access body:

```json
{
  "UniqueBoardId": "ABC12345",
  "UniqueId": "user-guid",
  "Password": "optional-password"
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

## Development Notes

- The API uses singleton repositories, so most state lives only for the current process.
- Uploaded image files are deleted on API startup by `ClearStoredImagesAsync()`.
- There is no persistent database, authentication provider, authorization policy, or production identity system yet.
- Public board names must be unique, case-insensitively. Private board names are not checked by the same rule.
- Private boards that are not password-protected cannot be joined directly by board ID; users must request access.
- Image messages require the referenced image to belong to the sender.
- The client polls instead of using WebSockets or SignalR.
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
- Add real authentication and authorization.
- Add real-time delivery with SignalR or another push mechanism. Thinking web hooks, honestly.
- Harden invite, profile, and protected-board flows with broader manual testing.
- Persist uploaded images instead of clearing image storage at API startup(Metadata is not persistent so I don't want a buildup of lost images while testing).
- Improve board moderation and message deletion behavior.
- Add automated tests for service rules, controller behavior, and client API flows.
