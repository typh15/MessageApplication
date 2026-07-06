# Message Board Beta — Feature Request and UX Backlog

This document organizes the current beta feedback into actionable work items. Each item includes:

- user-facing goal
- likely implementation scope
- suggested backend and client work
- acceptance criteria
- rough priority and complexity
- dependencies or design cautions

The scope estimates are now aligned to the source as of 2026-07-06: an Expo/React Native client, ASP.NET Core API, service and repository layers, SQLite persistence, polling-based refresh, board membership workflows, profiles, image messages, private chats, and push notification subscriptions.

## Source-Aligned Architecture Snapshot

### Client

- The Expo Router screens live in `MessagingAppClient/src/app`.
- Domain API calls live in `MessagingAppClient/src/APIHandlers` and are re-exported through `ApiHandlerHub.ts`.
- API base URL resolution goes through `APIHandlers/Helpers/config.ts`; the sign-in page can persist a server URL in AsyncStorage, otherwise the client uses the beta Tailscale Funnel URL.
- Session state is stored in AsyncStorage by `src/session/session-storage.ts` as `uniqueid` and `username`.
- Polling is centralized in `src/hooks/use-polling.tsx`.
- Current polling intervals are 5000 ms for boards, board details, and join requests, and 500 ms for chat messages.
- Home currently calls `useBoards()`, which calls `GET /message-boards?uniqueId=...`, then renders one combined "Available boards" list.
- The current `MessageBoard` client type has `isFavorite`, but no `isMember`, `unreadCount`, `memberCount`, or `lastMessage` summary data.
- Home rows currently always render a `Join` button, so the client cannot reliably show `Open` vs `Join` without an API response change.
- Board invites are currently surfaced on `Account-Page.tsx`, not through a Home notification center.
- Private one-to-one chats are implemented as hidden private boards named with the `USERCHAT:<first><second>` convention.

### API

- `Program.cs` registers controllers, CORS, EF/SQLite startup, repository selection, and singleton services.
- Controllers are thin and route most board, membership, message, account, image, and push work into `IChatServices`, `IAccountServices`, `IImageServices`, and `IPushNotificationServices`.
- Repository implementations are selected by configuration. SQLite is the beta default; memory repositories remain available for comparison/debugging.
- The SQLite EF model currently includes active users, user accounts, message boards, board members, favorites, join requests, invites, chat messages, images, push subscriptions, and chatbot conversation summaries.
- Board summaries are returned as `MessageBoardDataResponse` with `boardId`, `boardName`, `visibleToPublic`, `passwordProtected`, `uniqueBoardId`, and `isFavorite`.
- `GET /message-boards?uniqueId=...` currently returns public boards plus private boards the user belongs to. It does not split joined vs browse results.
- `POST /message-boards` currently resolves the active user from `UniqueId`, then the SQL repository adds both the board row and creator membership row in one `SaveChangesAsync` call.
- Messages have per-board IDs plus a `globalId` built as `{BoardId}-{Id}`. The SQLite schema has a unique index on `globalId`.
- There is no dedicated read-state table and no in-app notification table.
- Expo push infrastructure exists and is currently used for message notifications to board members other than the sender.
- API errors are often string `BadRequest`, `NotFound`, or `Unauthorized` responses. There is not yet global exception middleware or request correlation IDs.

### Backlog implications

- Board navigation work should start with the board summary contract, because the current client cannot distinguish joined from joinable public boards in Home.
- Creator membership is supposed to be handled by the current source. Treat that beta report as a reproduction, deployment/data verification, and test-hardening item rather than a simple missing-code task.
- Unread counts and the notification center both require new persisted server-side state or a deliberate aggregation endpoint.
- User invite search can reuse public profile data, but partial search should be server-filtered and board-aware.
- A backend message automation plugin host could generalize the chatbot pattern into reusable handlers for polls, prompts, summaries, moderation notices, and scheduled beta events.
- Replies, mentions, and reactions all extend message persistence and response shapes, so they should follow reliability, tests, unread state, and notifications.

---

## Recommended Priority Order

| Priority | Item | Primary reason |
| --- | --- | --- |
| P0 | Diagnose intermittent `Network response not ok` failures | Reliability issue affecting basic messaging and polling |
| P0 | Verify and harden creator membership contract | Source indicates this should already work; beta report needs reproduction and tests |
| P0 | Push notifications for invites and join requests | Backend-only improvement visible to installed clients |
| P0 | Server-side moderation, anti-spam, and reliability guardrails | Immediate backend-only protection for a small beta |
| P1 | Joined-boards-only home screen | Requires an explicit membership-aware board summary contract |
| P1 | Separate Browse Boards page | Separates discovery from Home after joined/browse API split |
| P1 | New-message count per board | Major daily-use improvement |
| P1 | Home-screen notification center | Consolidates invites and pending actions |
| P1 | Backend message automation plugin host | Makes polls, prompts, recaps, and bot-like features cheaper without client changes |
| P2 | Search and suggest users during invites | Improves an existing workflow |
| P2 | Replies to messages | High-value messaging feature |
| P2 | `@username` mentions | Useful after in app notifications exist |
| P3 | Emoji reactions | Valuable but introduces a new persisted data relationship |
| P3 / Defer | Contact linking or phone-number discovery | High privacy, permission, and platform complexity |

---

# Release Recommendation

For the next beta release, the most useful scope would be:

1. Diagnose the intermittent networking error.
2. Reproduce and test the creator-membership report against the current SQL and memory paths.
3. Add backend-only push notifications for invites and join requests.
4. Add server-side moderation, anti-spam, and reliability guardrails.
5. Add an explicit board-summary membership contract.
6. Change Home to joined boards only.
7. Add a separate Browse Boards page.
8. Add unread message counts.
9. Add a basic home-screen notification center.
10. Add user search to invitations.
11. Design a backend message automation plugin host before adding more bot-like features such as polls, recaps, or scheduled prompts.

Replies, mentions, and reactions are good follow-up features, but each adds message-related persistence or notification behavior. They will be easier to add after the testing, unread-state, and notification foundations exist.

---

# P0 — Reliability and Data Consistency

## 1. Intermittent `Network response not ok` Error

**Type:** Bug  
**Likely scope:** Client and backend investigation  
**Priority:** P0  
**Estimated complexity:** Medium until diagnosed

### User-facing problem

A request sometimes fails with a generic `Network response not ok` error. Retrying immediately often succeeds.

### Current source wiring

- `handler-messages.ts` logs the server response body, then throws the generic `Network response was not ok` error.
- Other API handler modules also repeat local `fetch` and error handling instead of sharing one request helper.
- `useMessages()` polls every 500 ms, while board/details/join-request hooks poll every 5000 ms.
- `Program.cs` does not currently configure global exception handling or request correlation IDs.
- Controllers often return useful string bodies, but the client does not consistently expose status code, route, request body context, or server error text.

### Possible causes

- temporary API or Tailscale Funnel interruption
- client timeout or unstable mobile connection
- concurrent polling and write activity
- SQLite write contention
- stale or invalid session state
- backend returning a useful non-success response that the client hides
- duplicate submission or race condition
- API process restart or deployment interruption

### Client-side work

- Add a shared API request helper under `src/APIHandlers/Helpers` and migrate handlers to it.
- Log the following for every failed request:
  - route
  - HTTP method
  - response status
  - response body
  - request timestamp
  - board ID
  - message type
  - client-generated request ID
- Replace generic errors with the actual server-provided error where possible.
- Disable the relevant submit button while a request is in progress.
- Add retries only for clearly transient failures.
- Preserve unsent message text after a failure.
- Consider a visible `Retry` action rather than silently resubmitting.
- Prevent duplicate sends while retrying.

### Backend work

- Add global exception handling.
- Add request correlation IDs.
- Log:
  - route
  - status code
  - session ID or user identity
  - board ID
  - request ID
  - exception details
  - database errors
- Return meaningful status codes:
  - `400` invalid input
  - `401` invalid session
  - `403` unauthorized board access
  - `404` missing board or message
  - `409` duplicate or conflict
  - `500` unexpected server failure
- Investigate SQLite locking or concurrency errors.
- Consider idempotency for message creation using a client-generated message ID.

### Acceptance criteria

- Every failure shows or logs the actual status code and response body.
- A failed client request can be matched to one backend request.
- Retrying a send cannot create duplicate messages.
- The root cause can be reproduced or narrowed to a specific layer.
- Unsent message text remains available after failure.

### Suggested tests

- Valid message request stores exactly one message.
- Invalid session returns `401`.
- Non-member send returns `403`.
- Duplicate request ID does not create a duplicate message.
- Simulated database failure returns a structured error.

---

## 2. Verify and Harden Board Creator Membership

**Type:** Bug investigation and contract hardening
**Likely scope:** Backend tests, beta data/deployment verification, small client refresh verification
**Priority:** P0  
**Estimated complexity:** Small to medium

### User-facing problem

A user creates a board, but the creator is not shown as a member, or another user appears instead.

### Current source wiring

The current source already intends to add the creator as a board member:

1. `POST /message-boards` receives `CreateMessageBoardRequest`.
2. `MessageBoardController` passes `UniqueId` into `IChatServices.CreateMessageBoardAsync`.
3. `ChatServices` resolves the active user by `UniqueId`.
4. `SqlMessageBoardRepository.CreateMessageBoardAsync` adds both a `MessageBoardRecord` and a `MessageBoardMemberRecord`.
5. The SQL repository saves both rows in one `SaveChangesAsync` call.
6. The memory repository also creates the board with the creator in `ActiveUsers`.

Because the current source has the expected behavior, this should be treated as a reproduction and hardening task. Confirm whether beta was running older code, whether SQLite data was inconsistent from a previous version, or whether the client displayed stale/misleading state after creation.

### Expected behavior

Creating a board should:

1. validate the creator session
2. resolve the creator account from the session
3. create the board
4. add the creator as a board member
5. save both changes
6. return the created board as a joined board

### Client-side work

- After board creation, refresh the joined-board list.
- Do not show `Join` for a newly created board.
- Immediately show the creator in the member list.
- Navigate to the board or Home only after successful creation and membership assignment.
- Surface the API's create-board error text instead of only showing a generic create failure.

### Backend work

- Keep resolving the creator from `UniqueId`; do not introduce username-authoritative creation.
- Add SQL and memory repository tests proving board creation also creates creator membership.
- Add service/controller tests proving invalid sessions cannot create boards.
- Confirm the SQL path remains atomic; if creation is later split across services, use an explicit transaction.
- Audit beta data for any board with zero members or a creator mismatch, if the issue is reproducible.
- Return enough response data for the client to know the created board is joined/openable.

### Acceptance criteria

- The creator always appears in the board member list.
- The creator can open the board immediately.
- The creator can send messages immediately.
- The creator never sees `Join` for their own board.
- No unrelated user is added as creator or member.

### Suggested tests

- Creating a board adds the creator as a member.
- Invalid sessions cannot create boards.
- Creator membership failure rolls back board creation.
- Creator can retrieve board details immediately after creation.

---

## 3. Backend-Only Push Notifications for Invites and Join Requests

**Type:** Backend-only beta improvement
**Likely scope:** Push notification service calls from existing membership workflows
**Priority:** P0
**Estimated complexity:** Small to medium

### User-facing goal

Users should be notified when they are invited to a board or when a board they belong to has a pending join request, without requiring a client reinstall.

### Why this is backend-only

- The installed client already registers Expo push tokens.
- The installed client already displays push notifications.
- The installed client already listens for notification taps and opens `Chat-Page` when the payload contains `boardId`.
- Existing membership workflows already know when invites and join requests are created.

### Current source wiring

- Push subscriptions are stored through `/push-notifications/subscriptions`.
- `PushNotificationServices.SendAsync()` can send to one or more `UniqueId` recipients.
- `ChatServices.SendMessageToBoardAsync()` already sends push notifications for new messages.
- `ChatServices.InviteUserJoinRequest()` creates board invites.
- `ChatServices.AddUserToRequests()` creates board join requests.
- The installed client can deep-link only from notification payload `boardId` to `Chat-Page`; it cannot yet route directly to Account or an invite-accept screen.

### Backend work

- Send a push notification to the invited user when `InviteUserJoinRequest()` successfully creates an invite.
- Send push notifications to existing board members when `AddUserToRequests()` successfully creates a join request.
- Optionally send a push notification to the requester when a join request is approved or denied.
- Use the existing push sender rather than adding a second delivery mechanism.
- Centralize push payload creation for membership events so it is not duplicated across service methods.
- Avoid deep-linking invited nonmembers into a board they cannot open yet. For invite notifications, either omit `boardId` for now or accept that tapping the notification may only open the app until a future client can route to Account/invites.
- For join-request reviewer notifications, include `boardId` because reviewers are already board members and can open the board.

### Suggested push payloads

Invite notification:

```json
{
  "type": "board_invite",
  "boardId": null,
  "inviteBoardId": 12
}
```

Join-request notification:

```json
{
  "type": "join_request",
  "boardId": 12
}
```

### Acceptance criteria

- Invited users receive a push notification when an invite is created.
- Board members receive a push notification when a new join request is created.
- Notification sending does not cause invite/request creation to fail if Expo delivery fails.
- Duplicate invite/request attempts do not send duplicate pushes.
- Sender/actor users do not receive their own action notification.
- Existing message push notifications keep working.

### Suggested tests

- Creating an invite calls the push sender for the invited user.
- Creating a duplicate invite does not call the push sender again.
- Creating a join request calls the push sender for current board members.
- A failed push send still leaves the invite/request persisted.
- Join-request notification recipients exclude the requesting user.

---

## 4. Server-Side Moderation, Anti-Spam, and Reliability Guardrails

**Type:** Backend-only reliability and safety improvement
**Likely scope:** API/service validation, rate limiting, duplicate protection, logging
**Priority:** P0
**Estimated complexity:** Small to medium

### User-facing goal

Keep the small beta usable and stable even if users double-submit, send accidental repeats, upload questionable content, or create noisy message bursts.

### Why this is backend-only

The current client already sends all message, image, invite, join, and board-creation requests through the API. The backend can reject or throttle unsafe/noisy actions with existing HTTP responses. The installed client may show a generic error in some cases, but the app state is still protected.

### Current source wiring

- Message creation already validates active session, board membership, image ownership, and message type.
- Image upload already enforces supported image types and size limits.
- SQLite has a unique index on message `GlobalId`, but there is no client-generated idempotency key.
- There is no rate limiting or slow mode for messages, board creation, invites, join requests, or login attempts.
- Error responses are not yet structured consistently, so moderation errors should return clear plain-text bodies until shared client error handling exists.

### Backend work

- Add per-user/per-board message rate limits, such as short-window burst limits and a small sustained-message limit.
- Add duplicate-send protection for same user, same board, same content/image within a short window.
- Enforce message content rules server-side:
  - trim content
  - reject empty text messages
  - enforce max content length before database write
  - optionally block a small configurable word/phrase list for beta safety
- Add invite/join-request rate limits to prevent notification spam.
- Add board-creation rate limits to prevent board list clutter.
- Ensure push notification failures never block the originating action.
- Add structured logs for moderation decisions: user, board, action, rule, and request ID once request IDs exist.
- Prefer `429 Too Many Requests` for rate limits and `400 Bad Request` for invalid content.

### Acceptance criteria

- A user cannot flood a board with rapid repeated messages.
- Accidental duplicate sends are ignored or rejected without creating duplicate rows.
- Invalid message content is rejected before persistence.
- Invite and join-request spam is throttled.
- Rejected actions are logged with enough context to debug beta reports.
- Existing legitimate small-group usage is not noticeably slowed.

### Suggested tests

- Rapid repeated sends from one user hit the rate limit.
- The same message sent twice within the duplicate window creates at most one row.
- Empty/oversized text content is rejected.
- Invite spam is throttled per inviter and board.
- Push sender failure does not fail message/invite/request persistence.

---

# P1 — Board Navigation and Daily UX

## 5. Home Screen Shows Joined Boards Only

**Type:** UX and navigation change  
**Likely scope:** API response shape plus client handler/hook/screen changes
**Priority:** P1  
**Estimated complexity:** Medium

### User-facing goal

The Home screen should act as the user’s personal board dashboard, not a combined membership and discovery page.

### Proposed Home screen

Home should contain:

- boards the user belongs to
- favorites
- unread message counts
- notification bell
- create board action
- Browse Boards navigation
- private chats, if they remain represented as hidden boards

Home should not contain:

- unjoined public boards
- Join buttons
- private boards the user has not joined

### Current source wiring

- Home is `Homescreen-Board-Select-Page.tsx`.
- Home calls `useBoards()`, which calls `APIHandler.getMessageBoards()`.
- `getMessageBoards()` calls `GET /message-boards?uniqueId=...`.
- `ChatServices.GetMessageBoardsAsync()` returns public boards plus private boards the user belongs to.
- `MessageBoardDataResponse` includes `isFavorite`, but not `isMember`.
- `BoardRow` always renders `Join`, so Home currently cannot reliably render joined boards as `Open`.

### Client-side work

- Add `getJoinedMessageBoards()` and a joined-board hook, or add a `view=joined` parameter to the existing handler.
- Render only joined boards.
- Replace `Join` with `Open` on Home.
- Show favorites near the top or in a dedicated section.
- Add a Browse Boards button or navigation tab.
- Add unread badges.
- Add notification bell and count.
- After joining or creating a board, insert it into Home immediately.

### Backend work

Prefer one of these API designs. A separate endpoint is clearer than requiring the client to infer membership from the current mixed board list.

#### Option A: separate endpoints

```http
GET /message-boards/joined?uniqueId={uniqueId}
GET /message-boards/browse?uniqueId={uniqueId}
```

#### Option B: filtered endpoint

```http
GET /message-boards?uniqueId={uniqueId}&view=joined
GET /message-boards?uniqueId={uniqueId}&view=browse
```

Joined-board responses should eventually include:

```json
{
  "boardId": 1,
  "boardName": "General",
  "visibleToPublic": true,
  "passwordProtected": false,
  "uniqueBoardId": "ABC12345",
  "isFavorite": true,
  "isMember": true,
  "unreadCount": 4
}
```

### Acceptance criteria

- Home only shows boards the user can already enter.
- Home never displays a Join button.
- Creating a board adds it directly to Home.
- Joining a board adds it directly to Home.
- Leaving a board removes it from Home.
- Private chats continue to appear only for participating users.

---

## 6. Separate Browse Boards Page

**Type:** UX and navigation change  
**Likely scope:** New client route plus API list filtering
**Priority:** P1  
**Estimated complexity:** Medium

### User-facing goal

Public boards the user has not joined should live on a separate Browse Boards screen.

### Proposed Browse screen

- public boards the user has not joined
- search public boards
- Join action
- password prompt for protected public boards
- enter board code / unique board ID
- request access to private boards
- optional category, activity, or member-count sorting later

### Current source wiring

- There is no Browse Boards route yet.
- Public board discovery is mixed into Home through `GET /message-boards?uniqueId=...`.
- Home already has a "Join private board" modal that calls `POST /message-boards/join-by-code`.
- Exact private-board request/access lookup currently goes through `POST /message-boards/search`.
- `GET /public-boardnames` exists, but it returns only names and is not enough for a Browse page.

### Client-side work

- Create a Browse Boards route.
- Add a Browse Boards action from Home.
- Add a browse-board handler/hook instead of reusing the current mixed `useBoards()` response.
- Show only public, unjoined boards.
- Add search and filtering.
- Support password-entry modal.
- Support private-board code lookup.
- Remove a board from Browse immediately after joining.
- Optionally navigate directly into the board after joining.

### Backend work

- Return only public boards the user has not joined.
- Do not expose private boards in ordinary browse results.
- Continue supporting exact private-board lookup by code or unique board ID.
- Include enough summary data for Browse without returning messages or full member lists.

### Acceptance criteria

- Browse never displays a board already joined by the user.
- Private boards do not leak into public browse results.
- Joining moves the board from Browse to Home.
- Password-protected public boards are visible but require a password to join.
- Private-board search remains code-based or exact-match only.

---

## 7. New-Message Count Per Board

**Type:** New feature  
**Likely scope:** Client and backend  
**Priority:** P1  
**Estimated complexity:** Medium

### User-facing goal

Show a notification-style count for messages added since the user last visited each board.

### Current source wiring

- There is no read-state table or repository method yet.
- `ChatMessageRecord` has `BoardId`, per-board `MessageId`, `ServerTimestamp`, and sender fields.
- `MessageBoardDataResponse` does not include `unreadCount`.
- `useMessages()` polls the full message list every 500 ms.
- `Chat-Page.tsx` tracks whether the user is near the bottom to show a local "New messages" button, but that state is not persisted.

### Recommended data model

Track a read position per user and board:

```text
BoardReadState
- BoardId
- UserUniqueId
- LastReadMessageId
- LastVisitedAtUtc
```

Unread count can then be calculated as messages with an ID greater than `LastReadMessageId`.

### Client-side work

- Render an unread badge on each joined board card.
- Mark a board read when opened or when the latest messages are displayed.
- Update counts during polling.
- Clear or reduce the count when the user views the board.
- Do not count the user’s own newly sent message as unread for that user.

### Backend work

- Add a `BoardReadStateRecord` and EF configuration keyed by `(BoardId, UserUniqueId)`.
- Persist per-user board read state through repository/service methods.
- Include `unreadCount` in joined-board summaries.
- Add a mark-read endpoint or update read state as part of message retrieval.
- Verify the user is a board member before returning or updating read state.

Suggested endpoint:

```http
POST /message-boards/{boardId}/read
```

Suggested body:

```json
{
  "uniqueId": "user-guid",
  "lastReadMessageId": 123
}
```

### Acceptance criteria

- New messages increase the board badge.
- Opening a board clears or reduces the badge.
- Counts persist across app reloads.
- Counts are specific to each user.
- The user’s own messages do not create misleading unread counts.

### Suggested tests

- New message increments unread count for other members.
- New message does not increment unread count for sender.
- Marking read updates the correct user-board pair.
- Users cannot mark read state for boards they do not belong to.

---

## 8. Home-Screen Notification Center

**Type:** New feature and navigation improvement  
**Likely scope:** Client and backend  
**Priority:** P1  
**Estimated complexity:** Medium

### User-facing goal

A notification bell should be visible from Home. Board invitations and similar actionable events should live there instead of only under the account page.

### Initial notification types

- board invite
- join request requiring review
- join request approved
- join request denied
- password/private board access update
- later:
  - mentions
  - replies
  - reactions

Push notifications already exist. This feature should reuse the existing Expo push infrastructure rather than introduce a new push system. The main new work is an in-app notification center, persistent or aggregated notification state, and deciding which events should also trigger the existing push sender.

### Current source wiring

- Board invites are currently shown in `Account-Page.tsx` via `GET /active-users/{uniqueId}/invites`.
- Join requests are currently shown from chat/join-request screens via `GET /message-boards/{boardId}/requests?memberUniqueId=...`.
- Push subscription endpoints exist under `/push-notifications/subscriptions`.
- `ChatServices.SendMessageToBoardAsync()` currently calls `pushNotificationServices.SendAsync()` for new message notifications.
- There is no in-app notification endpoint or table.
- There is no read/unread state yet, so notification badge counts should not depend on unread messages until item 5 exists.

### Client-side work

- Add a bell button to Home.
- Show unread/actionable count.
- Expand a panel or navigate to a notification screen.
- Support actions:
  - accept invite
  - reject invite
  - open board
  - approve request
  - deny request
- Refresh count after actions.
- Remove or de-emphasize duplicate invite UI on the account page.

### Backend options

The existing Expo push subscription and sending services should remain the delivery mechanism for device notifications. The backend work here is mainly to normalize notification events and expose them to the client as an in-app feed.

#### Minimal implementation

Aggregate existing pending data without adding a generic notification table:

- board invites
- join requests
- approval results if currently persisted
- unread counts

Example:

```http
GET /notifications?uniqueId={uniqueId}
```

#### Scalable implementation

Add a persisted notification model:

```text
Notification
- Id
- RecipientUniqueId
- Type
- ActorUserName
- BoardId
- MessageId
- IsRead
- CreatedAt
```

### Acceptance criteria

- Bell count reflects actionable items.
- Accepting or rejecting an item updates the count immediately.
- Notification actions work without navigating to the account page.
- Persisted notifications survive reload.
- A user cannot retrieve another user’s notifications.

---

# P2 — Membership and Messaging Enhancements

## 9. Search and Suggest Users When Inviting

**Type:** UX enhancement  
**Likely scope:** Client and backend  
**Priority:** P2  
**Estimated complexity:** Small to medium

### User-facing goal

When inviting users to a board, typing part of a username or display name should show matching suggestions.

### Current source wiring

- `Chat-Page.tsx` currently invites by exact username with `inviteUserToBoard(boardId, inviteUserName)`.
- `BoardMembershipController` accepts the invite as query parameters on `POST /message-boards/{boardId}/invites`.
- Exact public profile lookup exists through `GET /public-profiles/{userName}`.
- All public profiles can be fetched through `GET /public-profiles`, but client-side filtering that list on every invite search would not scale or protect enumeration well.
- Board member lookup exists through `GET /message-boards/{boardId}/members?uniqueId=...`.

### Client-side work

- Add search field to the invite UI.
- Wait until a minimum query length is reached.
- Debounce requests by roughly 250–400 ms.
- Show:
  - username
  - display name
  - avatar, when available
- Exclude or label:
  - current user
  - existing members
  - users already invited
- Selecting a suggestion should send the invite.

### Backend work

Add a search endpoint such as:

```http
GET /users/search?query=bri&boardId=12&requesterUniqueId=...
```

Return lightweight public data only:

```json
[
  {
    "uniqueId": "user-guid",
    "userName": "Brittany",
    "displayName": "Brittany",
    "avatarImageId": "image-id",
    "relationship": "not_member"
  }
]
```

### Acceptance criteria

- Suggestions appear after partial input.
- Results are case-insensitive.
- Existing members are excluded or labeled.
- Private account data is not exposed.
- Selecting a result sends the invite.

---

## 10. Reply to Messages

**Type:** Messaging feature  
**Likely scope:** Client and backend  
**Priority:** P2  
**Estimated complexity:** Medium

### User-facing goal

Allow a user to reply to a specific message with a quote preview and a link or scroll action back to the original message.

### Current source wiring

- `ChatMessageRecord` has no parent/reply field.
- `MessageBox` receives flat message data only.
- `Chat-Page.tsx` renders messages in a `ScrollView`, not a virtualized list with built-in scroll-to-index behavior.
- The API returns full message objects from `GET /message-boards/{boardId}/messages`.

### Recommended data model

Add a nullable parent message reference:

```text
ReplyToMessageId
```

A message response can include:

```json
{
  "id": 95,
  "content": "I agree",
  "replyToMessageId": 42,
  "replyPreview": {
    "fromUserName": "Brittany",
    "content": "Original message..."
  }
}
```

### Client-side work

- Add Reply to a message action menu or long press.
- Show the selected parent above the composer.
- Allow canceling the reply.
- Render a quote preview inside the reply message.
- Tap the preview to scroll to the original.
- Show a placeholder when the original has been deleted.
- Use stable message IDs as list keys.
- Consider a `FlatList` or equivalent with scroll-to-index support.

### Backend work

- Add nullable reply relationship to message persistence.
- Verify the parent message belongs to the same board.
- Return enough preview data to render the quote.
- Define deletion behavior:
  - keep reply reference with a deleted placeholder
  - or clear the relationship

### Acceptance criteria

- Replies can only reference messages in the same board.
- Quote preview shows sender and content.
- Tapping the quote navigates or scrolls to the parent.
- Deleted parent messages do not break the UI.
- Non-members cannot create replies in the board.

---

## 11. `@username` Mentions

**Type:** Messaging and notification feature  
**Likely scope:** Client and backend  
**Priority:** P2  
**Estimated complexity:** Medium

### User-facing goal

Typing `@` should suggest users. Mentioned users should receive an in-app notification and eventually a push notification.

### Current source wiring

- There is no structured mention data in `CreateChatMessageRequest`.
- There is no mention persistence table.
- The existing exact profile lookup and proposed invite search can provide the user-search foundation.
- The notification center should exist first so mentions have somewhere durable to appear in-app.

### Client-side work

- Detect `@` while composing.
- Show matching board members or users.
- Insert the selected username.
- Render mentions with distinct styling.
- Allow tapping a mention to open a public profile.
- Include structured mention data in the send request.

### Backend work

- Validate mentioned usernames.
- Store mention relationships:

```text
MessageMention
- MessageId
- MentionedUserUniqueId
```

- Create in-app notification entries.
- Optionally trigger push notifications.
- Ensure the mentioned user can access the board before notifying them.

### Suggested request shape

```json
{
  "content": "@Brittany can you check this?",
  "mentionedUserNames": ["Brittany"]
}
```

The backend should validate both the message content and the submitted usernames.

### Acceptance criteria

- Mention suggestions work.
- Mentioned names are visually distinct.
- Mentioned users receive an in-app notification.
- Nonexistent users cannot be mentioned.
- Users without board access do not receive inaccessible-board notifications.

### Dependency

Best implemented after the notification center exists.

---

# P3 — Social Features

## 12. Emoji Reactions

**Type:** Messaging feature  
**Likely scope:** Client and backend  
**Priority:** P3  
**Estimated complexity:** Medium to large

### User-facing goal

Allow users to react to messages with emoji and show aggregated counts.

### Current source wiring

- Messages are stored in `ChatMessages`.
- There is no reaction table.
- Message responses do not include aggregated reaction data.
- `MessageBox` does not have an action menu or reaction-chip UI yet.

### Recommended data model

```text
MessageReaction
- BoardId
- MessageId
- UserUniqueId
- Emoji
- CreatedAtUtc
```

Decide whether users may:

- add multiple different emoji to one message
- or have only one reaction total per message

A useful uniqueness rule is:

```text
one reaction per user, per emoji, per message
```

### Client-side work

- Add reaction picker through long press or message action menu.
- Render aggregated reaction chips.
- Highlight reactions added by the current user.
- Tap to add or remove a reaction.
- Optionally show a list of users who reacted.

### Backend work

Add/remove endpoints such as:

```http
POST /message-boards/{boardId}/messages/{messageId}/reactions
DELETE /message-boards/{boardId}/messages/{messageId}/reactions/{emoji}
```

- Persist reactions.
- Verify board membership.
- Prevent duplicate reaction rows.
- Return aggregated reactions with messages.
- Optionally create notification events.

### Acceptance criteria

- Reactions persist.
- Counts remain accurate across clients.
- Repeated taps do not create duplicates.
- Non-members cannot react.
- Deleted messages also remove or hide their reactions.

---

## 13. Contact Linking, Phone Search, or Searchable Profile Tag

**Type:** Large discovery feature  
**Likely scope:** Client, backend, native permissions, and privacy design  
**Priority:** P3 or defer  
**Estimated complexity:** Large

### User-facing request

Allow users to find others through contacts, phone numbers, or a profile-associated `#` value.

### Risks and complexity

- native contact permissions
- different web and mobile behavior
- phone normalization
- phone verification
- user opt-in requirements
- privacy and abuse prevention
- account enumeration risk
- rate limiting
- secure storage or hashing
- legal/privacy disclosure needs

### Recommended phased approach

#### Phase 1: Improve existing search

- username search
- display-name search
- avatar and public profile preview

#### Phase 2: Optional public discovery handle

Allow a user to choose a public handle or tag:

```text
#brittany123
```

This can be searched without exposing phone numbers or device contacts.

#### Phase 3: Shareable identity

- QR code
- profile link
- board invite link
- shareable username card

#### Phase 4: Verified phone discovery

Only consider after adding:

- verified phone numbers
- discoverability opt-in
- normalization
- rate limiting
- privacy documentation
- secure matching

### Recommendation

Do not implement native contact linking in the near term. A public handle, QR code, or profile link would deliver much of the same convenience with far less risk.

---

# Suggested GitHub Issue Breakdown

## Milestone 1 — Reliability and Tests

- [ ] Add shared client API request helper
- [ ] Add global ASP.NET exception handling
- [ ] Add correlation IDs to client and backend logs
- [ ] Include status/body/route/request ID in client request failures
- [ ] Preserve unsent message text after request failure
- [ ] Reproduce intermittent send failure
- [ ] Add send-message integration tests
- [ ] Add registration and login tests
- [ ] Add board membership authorization tests
- [ ] Verify current create-board creator membership in SQL and memory repositories
- [ ] Add create-board membership contract tests
- [ ] Add idempotent message send or duplicate-send protection
- [ ] Add push notifications for board invites
- [ ] Add push notifications for join requests
- [ ] Ensure push sender failures do not fail source actions
- [ ] Add message rate limiting
- [ ] Add duplicate-send protection
- [ ] Add invite and join-request rate limiting
- [ ] Add moderation/rejection logs
- [ ] Sketch backend message automation plugin host

## Milestone 2 — Home and Browse Navigation

- [ ] Add joined-board query or endpoint
- [ ] Add browse-board query or endpoint
- [ ] Add explicit `isMember` or joined-only board summary contract
- [ ] Change Home to joined boards only
- [ ] Replace Home `Join` row action with `Open`
- [ ] Create Browse Boards screen
- [ ] Remove Join actions from Home
- [ ] Remove joined boards from Browse
- [ ] Move joined board from Browse to Home immediately
- [ ] Verify private boards do not appear in Browse
- [ ] Verify creator-created boards appear directly in Home

## Milestone 3 — Unread State

- [ ] Design `BoardReadState`
- [ ] Add read-state persistence
- [ ] Add unread counts to joined-board summaries
- [ ] Add mark-read endpoint
- [ ] Add unread badges to Home
- [ ] Prevent own messages from incrementing own unread count
- [ ] Add read-state service and repository tests

## Milestone 4 — Notification Center

- [ ] Define notification response contract
- [ ] Reuse existing Expo push sender for eligible notification events
- [ ] Add aggregate or persisted notification endpoint
- [ ] Add Home bell and badge
- [ ] Move board invite actions into notification UI
- [ ] Add join-request review actions
- [ ] Add approval and denial results
- [ ] Add notification authorization tests

## Milestone 5 — Member Discovery

- [ ] Add user search endpoint
- [ ] Add debounced invite search
- [ ] Exclude current members and duplicate invites
- [ ] Add avatar and display-name suggestions
- [ ] Add search authorization and privacy tests

## Milestone 6 — Replies and Mentions

- [ ] Add `ReplyToMessageId`
- [ ] Add reply preview response
- [ ] Add reply composer UI
- [ ] Add quoted-message rendering
- [ ] Add scroll-to-parent behavior
- [ ] Define reply behavior for deleted parents
- [ ] Add mention suggestions
- [ ] Add structured mention request data
- [ ] Add mention persistence
- [ ] Add mention notifications
- [ ] Add reply and mention tests

## Milestone 7 — Reactions

- [ ] Design reaction uniqueness behavior
- [ ] Add reaction persistence
- [ ] Add reaction endpoints
- [ ] Add reaction picker
- [ ] Add aggregated reaction chips
- [ ] Add reaction authorization and duplicate-prevention tests

---

# Testing Priorities

The following tests should be near the top of the overall project backlog.

## Registration and Login

- duplicate usernames are rejected
- invalid passwords are rejected
- valid login creates or refreshes a session
- invalid session IDs cannot access protected resources

## Boards and Membership

- creating a board adds the creator as a member
- private boards are inaccessible to non-members
- public boards can be joined
- password-protected boards reject incorrect passwords
- accepted invitations add membership
- rejected invitations do not add membership
- join requests can only be approved or denied by board members
- leaving a board removes it from the joined-board list

## Messages

- members can send messages
- non-members cannot send messages
- a sender can delete their own message
- a user cannot delete another user’s message
- retries do not create duplicate messages
- image messages require a valid uploaded image
- reply targets must belong to the same board

## Persistence Contracts

Run equivalent repository behavior tests against:

- SQLite implementations
- in-memory implementations

This verifies that both repository implementations honor the same interface expectations.

---

# Design Notes

## Separate membership from activity

Avoid using one collection to mean both:

- currently online
- permanently allowed to access a board

Useful distinct concepts are:

```text
Account
ActiveSession
BoardMember
BoardInvite
BoardJoinRequest
BoardReadState
```

## Do not trust usernames for authorization

Use the session or account identity resolved from `UniqueId` for:

- board creation
- membership changes
- message ownership
- invitation actions
- notification retrieval
- read-state updates

Usernames should be display identifiers, not authoritative credentials.

Current source note: some existing invite/request paths still accept or resolve `userName` values, especially approval/denial and invite flows. New work should avoid deepening that pattern and should prefer `UniqueId` when changing contracts.

## Prefer structured responses

Avoid returning only booleans or strings for multi-step workflows. Prefer response models such as:

```json
{
  "success": true,
  "status": "joined",
  "boardId": 12,
  "message": null
}
```

This makes client behavior more predictable and reduces generic `Network response not ok` errors.

## Prefer a shared client request helper

Most API handlers currently repeat `fetch`, response text logging, and error throwing. A shared helper would make request IDs, status-aware errors, retries, and beta diagnostics much easier to apply consistently.

## Add a backend message automation plugin host

The chatbot feature is a good proof that some product features can ship entirely through backend behavior. A small backend automation host would make that pattern reusable instead of one-off.

The useful abstraction is an event-driven plugin layer that can listen to existing backend events and optionally post normal chat messages, send existing push notifications, create/invite boards, or store plugin-specific state.

Suggested events:

- `MessageCreated`
- `BoardCreated`
- `UserJoinedBoard`
- `BoardInviteCreated`
- `JoinRequestCreated`
- `ScheduledTick`

Suggested plugin interface shape:

```text
IMessageAutomationPlugin
- Name
- IsEnabled(configuration)
- HandleAsync(MessageAutomationContext context)
```

Suggested shared capabilities:

- post a bot message to a board
- send an Expo push notification through the existing sender
- create or invite users to a board through existing services
- read/write plugin state
- ignore messages from bot users unless explicitly enabled
- enforce idempotency per event

This would make text-based polls much easier without a client update. For example, a `PollPlugin` could watch for a message like:

```text
/poll Lunch? | Pizza | Sushi | Tacos
```

Then it could store poll state server-side, post a normal chat message with the options, count later messages such as `vote A`, and periodically post a normal tally message. The installed client would see only regular messages.

Guardrails:

- prevent plugins from responding to their own bot messages in a loop
- rate limit automated posts
- keep plugin state separate from core board/message state
- make every plugin individually configurable
- log every automated action with the triggering event ID

## Avoid adding all social features at once

Replies, mentions, reactions, unread counts, and notifications interact with one another. A useful implementation sequence is:

1. tests and reliability
2. backend-only push, moderation, anti-spam, and duplicate-send guardrails
3. backend message automation plugin host
4. board list contract
5. Home/Browse navigation
6. unread state
7. notification center
8. user search
9. replies
10. mentions
11. reactions
12. optional discovery handles or links
