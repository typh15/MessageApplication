# SQL Persistence Plan

The API currently stores most data in singleton, in-memory repositories. This plan moves the app toward SQL persistence in stages so each repository can be verified without changing every controller and service at once.

For a fuller explanation of the persistence folder, repository switches, schema records, and debugging workflow, see [SQL Persistence Reference](sql-persistence-reference.md).

## Portability Baseline

- The first SQL provider is SQLite because it creates one database file and is easy to move between a laptop and a single deployed API machine.
- The database path lives in `ConnectionStrings:MessagingAppData`, so a different host can choose a different file location without code changes.
- Relative SQLite paths are resolved under the API content root. The default development database is `MessagingApp.Api/App_Data/messagingapp.workspace.sqlite`.
- Generated database files are ignored by Git. Test data on a developer laptop is intentionally disposable.
- The SQL schema is registered separately from the active repositories at first. This lets us inspect and evolve the table design before each repository starts using it.
- Startup initialization should fail fast now that repositories are SQL-backed. `Persistence:FailStartupOnInitializationError` should stay `true` for SQL-backed environments.
- Image file cleanup is config-controlled through `ImageStorage:ClearStoredImagesOnStartup`. It can stay `true` while image metadata is in memory, then switch to `false` when the image repository is persistent.
- Repository implementations are selected through `RepositoryStorage`. The in-memory implementations stay in the codebase as reference/debug implementations while SQL implementations are added beside them.

## Fresh Computer Setup

Pulling from Git carries the source code, repository interfaces, SQL model classes, appsettings defaults, and this plan. It does not carry local database files, uploaded image files, or any other generated runtime data under `MessagingApp.Api/App_Data`.

For a fresh development machine:

1. Install the .NET SDK version used by the API.
2. Pull the repository from Git.
3. Run `dotnet restore` from `MessagingApp.Api`.
4. Confirm `MessagingApp.Api/appsettings.Development.json` has the desired `ConnectionStrings:MessagingAppData` value.
5. Confirm `RepositoryStorage` is set to the desired implementation for each migrated repository.
6. Start the API. When SQL initialization is enabled, the configured SQLite database file is created on that machine.

For the deployed API machine:

1. Pull or copy the built API to the host.
2. Choose where the real SQLite file should live. Prefer a path outside the source tree for deployed data, such as a dedicated app-data folder that is included in machine backups.
3. Override `ConnectionStrings:MessagingAppData` for that host. Do this with environment variables, deployment config, or a host-specific settings file that is not committed to Git.
4. After repositories are migrated to SQL, set `Persistence:FailStartupOnInitializationError` to `true` so the API does not run against a missing or broken database.
5. After image metadata is migrated to SQL, set `ImageStorage:ClearStoredImagesOnStartup` to `false` and make sure the image storage folder is also backed up.

Moving real data between computers is separate from pulling Git. To move a SQLite-backed environment, stop the API, copy the SQLite database file and uploaded image storage folder together, place them on the target machine, and point the target connection string and image storage settings at those copied files.

## Switching Repositories

Each repository migration keeps the old in-memory class and adds a SQL class beside it. This makes it easy to compare behavior and temporarily switch back while debugging.

Current repository switches:

```json
{
  "RepositoryStorage": {
    "ActiveUsers": "Sqlite",
    "MessageBoards": "Sqlite",
    "UserAccounts": "Sqlite",
    "Images": "Sqlite",
    "PushNotifications": "Sqlite"
  }
}
```

Allowed values are:

- `Sqlite`: use the SQL-backed implementation.
- `Memory`: use the original in-memory implementation.

The user account repository now has both implementations:

- `UserAccountRepository`: original in-memory implementation.
- `SqlUserAccountRepository`: SQL implementation backed by `UserAccounts`.

The image repository now has both implementations:

- `ImageRepository`: original in-memory metadata implementation.
- `SqlImageRepository`: SQL metadata implementation backed by `Images`.

When `Images` is set to `Sqlite`, `ImageStorage:ClearStoredImagesOnStartup` should be `false` so persisted metadata does not point at deleted image files.

The push notification repository now has both implementations:

- `PushNotificationRepository`: original in-memory implementation.
- `SqlPushNotificationRepository`: SQL implementation backed by `PushNotificationSubscriptions`.

The push token ownership rule is preserved: a token can move between users, but a token should only have one current owner.

The active user repository now has both implementations:

- `ActiveUserRepository`: original in-memory implementation.
- `SqlActiveUserRepository`: SQL implementation backed by `ActiveUsers`.

Active user board, request, and invite ID lists are rehydrated from SQL join tables.

The message board repository now has both implementations:

- `MessageBoardRepository`: original in-memory implementation.
- `SqlMessageBoardRepository`: SQL implementation backed by `MessageBoards`, `ChatMessages`, and the board relationship tables.

Board members, join requests, and invites are stored in join tables and rehydrated back into the current `MessageBoard` model for service/controller compatibility.

## Repository Migration Order

1. `IUserAccountRepository` - SQL implementation added.
   - Small surface area and mostly independent.
   - Uses case-insensitive auth-id uniqueness through a normalized auth-id column.

2. `IImageRepository` - SQL implementation added.
   - Metadata moves to SQL, while image bytes remain on disk.
   - `ImageStorage:ClearStoredImagesOnStartup` should be `false` while SQL image metadata is active.

3. `IPushNotificationRepository` - SQL implementation added.
   - Straightforward upsert/delete/query behavior.
   - Needs one subscription per `(uniqueId, expoPushToken)` and one owner per push token.

4. `IActiveUserRepository` - SQL implementation added.
   - Central identity/session store.
   - Carries board membership/request/invite lists today; those become SQL joins.

5. `IMessageBoardRepository` - SQL implementation added.
   - Largest behavior surface.
   - Boards, messages, members, join requests, and invites move into normalized tables.

## Table Map

| Current in-memory data | SQL table |
| --- | --- |
| `ActiveUser` | `ActiveUsers` |
| `UserAccount` | `UserAccounts` |
| `MessageBoard` basic data | `MessageBoards` |
| `MessageBoard.ActiveUsers` and `ActiveUser.MessageBoardIds` | `MessageBoardMembers` |
| `MessageBoard.UserRequests` and `ActiveUser.RequestedMessageBoardIds` | `MessageBoardJoinRequests` |
| `MessageBoard.UserInvites` and `ActiveUser.InvitedMessageBoardIds` | `MessageBoardInvites` |
| `ChatMessage[]` inside each board | `ChatMessages` |
| `ImageModel` metadata | `Images` |
| `PushNotificationSubscription` | `PushNotificationSubscriptions` |

## Important Behavior to Preserve

- Registration currently creates a user account before it creates the active user. The account table therefore does not require an active-user foreign key.
- Uploaded image metadata can reference an owner ID without enforcing that the owner is still active.
- Public board names are checked case-insensitively in service code. The SQL model includes normalized name columns so repository implementations can preserve that behavior without relying on database-specific collations.
- Message IDs are board-local. `ChatMessages` uses `(BoardId, MessageId)` as its key, while `GlobalId` stays unique.
- Push tokens can move between users. The SQL model keeps `ExpoPushToken` unique so an upsert can remove an old owner and assign the token to the current user.

## Stage Completion Checks

- The API builds.
- Starting the API creates the configured SQLite database file.
- Existing endpoints still behave the same while repositories remain in memory.
- Each repository migration gets its own focused verification path before moving to the next repository.
