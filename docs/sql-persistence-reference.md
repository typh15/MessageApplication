# SQL Persistence Reference

This document explains how the SQL persistence layer is organized, how it fits into the existing API, and how to safely migrate or debug repositories during future updates.

The short version: controllers and services should continue depending on repository interfaces. Persistence changes happen behind those interfaces, one repository at a time.

## Goals

- Keep the original in-memory repositories in the codebase for comparison and debugging.
- Add SQL-backed repositories beside the in-memory implementations.
- Switch each repository through configuration instead of deleting old code.
- Keep local laptop data disposable.
- Make deployed storage portable by using configuration for database paths.

## Startup Flow

API startup happens in `MessagingApp.Api/Program.cs`.

The persistence-related calls are:

```csharp
builder.Services.AddSqlDataStore(builder.Configuration, builder.Environment);
builder.Services.AddMessagingAppRepositories(builder.Configuration);

// Later, after builder.Build()
await app.Services.InitializeSqlDataStoreAsync();
```

That means startup does three persistence jobs:

1. Register EF Core and the SQLite connection.
2. Register repository implementations.
3. Create or validate the SQL schema before handling requests.

## Configuration

Persistence is controlled by three config areas.

### `ConnectionStrings`

```json
{
  "ConnectionStrings": {
    "MessagingAppData": "Data Source=App_Data/messagingapp.workspace.sqlite"
  }
}
```

`MessagingAppData` is the SQLite database location. Relative paths are resolved under the API content root.

Git carries this default setting, but not the actual database file. Local database files are generated runtime data and are ignored.

### `Persistence`

```json
{
  "Persistence": {
    "Provider": "Sqlite",
    "InitializeDatabaseOnStartup": true,
    "FailStartupOnInitializationError": true
  }
}
```

- `Provider`: currently only `Sqlite` is supported.
- `InitializeDatabaseOnStartup`: when `true`, startup creates/checks tables.
- `FailStartupOnInitializationError`: when `true`, database initialization errors stop the API.

Now that repositories are SQL-backed by default, this should stay `true` for normal SQL-backed development and deployment.

### `RepositoryStorage`

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

Repository switches decide whether a migrated repository uses SQL or memory.

Allowed values:

- `Sqlite`: use the SQL-backed implementation.
- `Memory`: use the original in-memory implementation.

Current switches:

| Setting | Interface | SQL implementation | Memory implementation |
| --- | --- | --- | --- |
| `ActiveUsers` | `IActiveUserRepository` | `SqlActiveUserRepository` | `ActiveUserRepository` |
| `MessageBoards` | `IMessageBoardRepository` | `SqlMessageBoardRepository` | `MessageBoardRepository` |
| `UserAccounts` | `IUserAccountRepository` | `SqlUserAccountRepository` | `UserAccountRepository` |
| `Images` | `IImageRepository` | `SqlImageRepository` | `ImageRepository` |
| `PushNotifications` | `IPushNotificationRepository` | `SqlPushNotificationRepository` | `PushNotificationRepository` |

Future migrated repositories should get their own switch here.

### `ImageStorage`

```json
{
  "ImageStorage": {
    "ClearStoredImagesOnStartup": true
  }
}
```

This controls whether uploaded image files are deleted when the API starts.

It can stay `true` while image metadata is in memory. After image metadata moves to SQL, it should be set to `false`, otherwise the database could point at files that were deleted during startup.

## Persistence Folder

The `MessagingApp.Api/Persistence` folder is the database wiring layer. It should not contain app business rules.

### `SqlDataStoreOptions.cs`

Maps the `Persistence` config section into C# options.

This keeps startup code from reading stringly-typed config values everywhere.

### `RepositoryStorageOptions.cs`

Maps the `RepositoryStorage` config section.

It also defines the two supported storage names:

```csharp
Memory
Sqlite
```

As more repositories are migrated, this file should gain additional properties, such as:

```csharp
public string Images { get; set; } = RepositoryStorageProviders.Sqlite;
public string PushNotifications { get; set; } = RepositoryStorageProviders.Sqlite;
```

### `RepositoryRegistration.cs`

This is the repository switchboard.

It registers repository interfaces with dependency injection. For repositories that have not been migrated yet, it registers the original memory implementation directly.

For migrated repositories, it checks config:

- `Memory` returns the original in-memory class.
- `Sqlite` returns the SQL-backed class.

This is what lets us keep both implementations and flip between them while debugging.

### `SqlDataStoreRegistration.cs`

This registers and initializes the SQL database.

It does several things:

- Reads `Persistence` config.
- Confirms the provider is supported.
- Registers `MessagingAppDbContext` through `AddDbContextFactory`.
- Builds the SQLite connection string.
- Converts relative database paths to full paths.
- Creates the database directory when needed.
- Checks for required tables.
- Creates the schema when no tables exist.
- Refuses to continue silently if a partial schema exists.

The partial-schema check is intentional. A fresh missing database is easy to recreate. A half-created database can produce confusing behavior later.

### `PersistenceRecords.cs`

Defines SQL-shaped record classes.

These are not the same as the app-facing models. They represent how data should live in tables.

For example, the in-memory `MessageBoard` model currently contains arrays of `ActiveUser` objects. SQL should not store nested user objects inside a board row. SQL stores that relationship through join tables.

Important records:

| Record | Purpose |
| --- | --- |
| `ActiveUserRecord` | SQL shape for active/session users |
| `UserAccountRecord` | SQL shape for account/profile/login data |
| `MessageBoardRecord` | SQL shape for board metadata |
| `MessageBoardMemberRecord` | Join table for board members |
| `MessageBoardJoinRequestRecord` | Join table for pending board requests |
| `MessageBoardInviteRecord` | Join table for board invites |
| `ChatMessageRecord` | SQL shape for chat messages |
| `ImageRecord` | SQL shape for image metadata |
| `PushNotificationSubscriptionRecord` | SQL shape for push subscriptions |

### `MessagingAppDbContext.cs`

This is EF Core's database map.

The `DbSet` properties represent tables. The `OnModelCreating` methods define:

- Table names.
- Primary keys.
- Required fields.
- Maximum field lengths.
- Indexes.
- Unique constraints.
- Relationships.
- Cascade delete behavior.

Examples:

- `UserAccounts` uses `UniqueId` as the primary key.
- `UserAccounts.NormalizedAuthId` is unique for case-insensitive login uniqueness.
- `ChatMessages` uses `(BoardId, MessageId)` because message IDs are board-local.
- `MessageBoardMembers` uses `(BoardId, UserUniqueId)` because a user should only appear once in a board.
- `PushNotificationSubscriptions.ExpoPushToken` is unique so a token cannot belong to multiple users.

## Repository Pattern

The key rule: controllers and services should depend on interfaces, not concrete storage.

Example:

```csharp
private readonly IUserAccountRepository userAccountRepository;
```

That dependency can point to memory or SQL without changing the service.

Each migration should follow this pattern:

1. Leave the original in-memory repository in place.
2. Add a SQL repository beside it.
3. Keep the existing interface unchanged if possible.
4. Add a config switch under `RepositoryStorage`.
5. Register both implementations through `RepositoryRegistration`.
6. Verify SQL behavior.
7. Flip back to memory if comparison/debugging is needed.

## Current Migrated Repository

### User Accounts

Interface:

```csharp
IUserAccountRepository
```

Original implementation:

```csharp
UserAccountRepository
```

SQL implementation:

```csharp
SqlUserAccountRepository
```

The SQL implementation preserves current behavior:

- Rejects null or incomplete accounts.
- Rejects duplicate `UniqueId`.
- Rejects duplicate auth IDs case-insensitively.
- Looks up auth IDs case-insensitively using `NormalizedAuthId`.
- Deletes account rows by `UniqueId` for account deletion.
- Returns `false` instead of throwing for normal validation failures.

### Image Metadata

Interface:

```csharp
IImageRepository
```

Original implementation:

```csharp
ImageRepository
```

SQL implementation:

```csharp
SqlImageRepository
```

The SQL implementation stores image metadata only. The actual image bytes still live on disk through `ImageServices`.

The SQL implementation preserves current repository behavior:

- Rejects null images.
- Rejects blank image IDs.
- Rejects duplicate image IDs.
- Returns `null` for missing images.
- Returns an empty list for blank owner IDs.
- Deletes metadata by image ID.

Important: image metadata and image files are a pair. If metadata is SQL-backed, startup image cleanup should be off:

```json
{
  "ImageStorage": {
    "ClearStoredImagesOnStartup": false
  }
}
```

### Push Notifications

Interface:

```csharp
IPushNotificationRepository
```

Original implementation:

```csharp
PushNotificationRepository
```

SQL implementation:

```csharp
SqlPushNotificationRepository
```

The SQL implementation preserves current behavior:

- Upserts by `(uniqueId, expoPushToken)`.
- Updates `DeviceId`, `Platform`, and `UpdatedAtUtc` when the same user/token already exists.
- Removes the same Expo push token from other users before assigning it to the current user.
- Deletes by `(uniqueId, expoPushToken)`.
- Deletes all subscriptions for a `uniqueId` during account deletion.
- Returns subscriptions for a provided set of unique IDs.

The important rule is token ownership. A token can move from one user to another, but `ExpoPushToken` is unique in SQL so one token cannot belong to multiple users at the same time.

### Active Users

Interface:

```csharp
IActiveUserRepository
```

Original implementation:

```csharp
ActiveUserRepository
```

SQL implementation:

```csharp
SqlActiveUserRepository
```

The SQL implementation preserves current behavior where practical:

- Rejects null or incomplete users on add.
- Enforces case-insensitive username uniqueness with `NormalizedUserName`.
- Refreshes `LastActiveTime`, `Address`, and username-based lookups.
- Removes inactive users by `LastActiveTime`.
- Removes active-user rows by `UniqueId` during account deletion.
- Returns active users as app-facing `ActiveUser` models, not persistence records.
- Rehydrates `MessageBoardIds`, `RequestedMessageBoardIds`, and `InvitedMessageBoardIds` from SQL join tables.

Message board membership, request, and invite state now lives in SQL join tables. Service code should continue asking `IMessageBoardRepository` when it needs authoritative board membership or invite state.

### Message Boards

Interface:

```csharp
IMessageBoardRepository
```

Original implementation:

```csharp
MessageBoardRepository
```

SQL implementation:

```csharp
SqlMessageBoardRepository
```

The SQL implementation is the largest repository migration. It stores:

- Board metadata in `MessageBoards`.
- Chat messages in `ChatMessages`.
- Board members in `MessageBoardMembers`.
- Join requests in `MessageBoardJoinRequests`.
- Board invites in `MessageBoardInvites`.

It rehydrates the normalized SQL shape back into the existing `MessageBoard` app model so services and controllers can keep using the same interface.

Current behavior preserved:

- Board IDs and message IDs are board-local sequential values.
- Unique board IDs are generated with `IdGenerator.Get8CharId()`.
- Password hashes still use `PasswordHasher<MessageBoard>`.
- `GetMessageBoardsAsync()` returns board summary DTOs.
- `GetMessageBoardByIdAsync()` returns full board data including members, requests, invites, and messages.
- Message adds update `MostRecentMessageHash`.
- Membership checks use `UniqueId`.
- Request checks/removals preserve the current username-based behavior.
- Invite checks preserve the current username-based behavior, while invite adds/removals use `UniqueId` where the old repository did.

## Migration Order

Recommended order:

1. `IUserAccountRepository` - SQL implementation added.
2. `IImageRepository` - SQL implementation added.
3. `IPushNotificationRepository` - SQL implementation added.
4. `IActiveUserRepository` - SQL implementation added.
5. `IMessageBoardRepository` - SQL implementation added.

This order goes from least tangled to most tangled. Boards come last because they involve messages, members, join requests, invites, and active-user state.

## Fresh Machine Behavior

Pulling from Git carries:

- Source code.
- SQL model classes.
- Repository implementations.
- Config defaults.
- Documentation.

Pulling from Git does not carry:

- SQLite database files.
- Uploaded image files.
- Local test data.
- Runtime files under `MessagingApp.Api/App_Data`.

That is intentional. Laptop data is disposable until the app goes live.

On a fresh machine, the API should create a new SQLite file when startup initialization is enabled and the connection string points to a writable location.

## Deployment Notes

Before going live:

- Pick a stable database location on the API host.
- Override `ConnectionStrings:MessagingAppData` for that host.
- Back up the SQLite file.
- After image metadata is persistent, also back up the image file folder.
- Set `Persistence:FailStartupOnInitializationError` to `true`.
- Set `ImageStorage:ClearStoredImagesOnStartup` to `false` after image metadata uses SQL.

## Debugging Checklist

When something acts weird during migration:

1. Flip the affected repository back to `Memory`.
2. Retry the same user flow.
3. If memory works and SQL fails, compare the SQL repository to the original memory repository.
4. Check whether the SQL record shape is missing data the app model expects.
5. Check whether casing/normalization behavior matches memory behavior.
6. Check whether a relationship should be represented by a join table.
7. Check whether startup created all required tables.

## Terms

- **App model**: A class used by controllers/services, such as `UserAccount`, `ActiveUser`, or `MessageBoard`.
- **Persistence record**: A SQL-shaped class in `PersistenceRecords.cs`, such as `UserAccountRecord`.
- **DbContext**: EF Core's object that maps C# records to SQL tables.
- **Repository interface**: The contract services use, such as `IUserAccountRepository`.
- **Memory repository**: The original in-memory implementation.
- **SQL repository**: A new implementation that stores data in SQLite.
- **Join table**: A table that stores relationships between two entities, such as board membership.
