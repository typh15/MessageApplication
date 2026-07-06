# Message Board Beta — Feature Request and UX Backlog

This document organizes the current beta feedback into actionable work items. Each item includes:

- user-facing goal
- likely implementation scope
- suggested backend and client work
- acceptance criteria
- rough priority and complexity
- dependencies or design cautions

The scope estimates are based on the current architecture: an Expo/React Native client, ASP.NET Core API, service and repository layers, SQLite persistence, polling-based refresh, board membership workflows, profiles, image messages, private chats, and push notification subscriptions.

---

## Recommended Priority Order

| Priority | Item | Primary reason |
| --- | --- | --- |
| P0 | Diagnose intermittent `Network response not ok` failures | Reliability issue affecting basic messaging |
| P0 | Fix board creator not appearing as a member | Data consistency and authorization issue |
| P1 | Joined-boards-only home screen | Clarifies the core navigation model |
| P1 | Separate Browse Boards page | Removes confusing Join behavior from Home |
| P1 | New-message count per board | Major daily-use improvement |
| P1 | Home-screen notification center | Consolidates invites and pending actions |
| P2 | Search and suggest users during invites | Improves an existing workflow |
| P2 | Replies to messages | High-value messaging feature |
| P2 | `@username` mentions | Useful after in app notifications exist |
| P3 | Emoji reactions | Valuable but introduces a new persisted data relationship |
| P3 / Defer | Contact linking or phone-number discovery | High privacy, permission, and platform complexity |

---

# Release Recommendation

For the next beta release, the most useful scope would be:

1. Diagnose the intermittent networking error.
2. Fix creator membership.
3. Change Home to joined boards only.
4. Add a separate Browse Boards page.
5. Add unread message counts.
6. Add a basic home-screen notification center.
7. Add user search to invitations.

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

## 2. Board Creator Is Not Listed as a Member

**Type:** Bug  
**Likely scope:** Backend primarily, with small client verification  
**Priority:** P0  
**Estimated complexity:** Small to medium

### User-facing problem

A user creates a board, but the creator is not shown as a member, or another user appears instead.

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

### Backend work

- Resolve the creator from `UniqueId`.
- Do not trust a client-submitted username as the authoritative creator identity.
- Add board creation and creator membership in one service operation.
- Use one database transaction if the current EF Core structure allows it.
- If membership creation fails, do not leave a partially created board.
- Return the board only after membership is established.

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

# P1 — Board Navigation and Daily UX

## 3. Home Screen Shows Joined Boards Only

**Type:** UX and navigation change  
**Likely scope:** Client plus a small backend/API change  
**Priority:** P1  
**Estimated complexity:** Small to medium

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

### Client-side work

- Render only joined boards.
- Replace `Join` with `Open`.
- Show favorites near the top or in a dedicated section.
- Add a Browse Boards button or navigation tab.
- Add unread badges.
- Add notification bell and count.
- After joining or creating a board, insert it into Home immediately.

### Backend work

Prefer one of these API designs:

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
  "isFavorite": true,
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

## 4. Separate Browse Boards Page

**Type:** UX and navigation change  
**Likely scope:** Client plus a small backend/API change  
**Priority:** P1  
**Estimated complexity:** Small to medium

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

### Client-side work

- Create a Browse Boards route.
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

## 5. New-Message Count Per Board

**Type:** New feature  
**Likely scope:** Client and backend  
**Priority:** P1  
**Estimated complexity:** Medium

### User-facing goal

Show a notification-style count for messages added since the user last visited each board.

### Recommended data model

Track a read position per user and board:

```text
BoardReadState
- UserUniqueId
- BoardId
- LastReadMessageId
- LastVisitedAt
```

Unread count can then be calculated as messages with an ID greater than `LastReadMessageId`.

### Client-side work

- Render an unread badge on each joined board card.
- Mark a board read when opened or when the latest messages are displayed.
- Update counts during polling.
- Clear or reduce the count when the user views the board.
- Do not count the user’s own newly sent message as unread for that user.

### Backend work

- Persist per-user board read state.
- Include `unreadCount` in joined-board summaries.
- Add a mark-read endpoint or update read state as part of message retrieval.

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

## 6. Home-Screen Notification Center

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

## 7. Search and Suggest Users When Inviting

**Type:** UX enhancement  
**Likely scope:** Client and backend  
**Priority:** P2  
**Estimated complexity:** Small to medium

### User-facing goal

When inviting users to a board, typing part of a username or display name should show matching suggestions.

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
    "userName": "Brittany",
    "displayName": "Brittany",
    "avatarImageId": "image-id"
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

## 8. Reply to Messages

**Type:** Messaging feature  
**Likely scope:** Client and backend  
**Priority:** P2  
**Estimated complexity:** Medium

### User-facing goal

Allow a user to reply to a specific message with a quote preview and a link or scroll action back to the original message.

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

## 9. `@username` Mentions

**Type:** Messaging and notification feature  
**Likely scope:** Client and backend  
**Priority:** P2  
**Estimated complexity:** Medium

### User-facing goal

Typing `@` should suggest users. Mentioned users should receive an in-app notification and eventually a push notification.

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

## 10. Emoji Reactions

**Type:** Messaging feature  
**Likely scope:** Client and backend  
**Priority:** P3  
**Estimated complexity:** Medium to large

### User-facing goal

Allow users to react to messages with emoji and show aggregated counts.

### Recommended data model

```text
MessageReaction
- MessageId
- UserUniqueId
- Emoji
- CreatedAt
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

## 11. Contact Linking, Phone Search, or Searchable Profile Tag

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

- [ ] Add global ASP.NET exception handling
- [ ] Add correlation IDs to client and backend logs
- [ ] Preserve unsent message text after request failure
- [ ] Reproduce intermittent send failure
- [ ] Add send-message integration tests
- [ ] Add registration and login tests
- [ ] Add board membership authorization tests
- [ ] Fix board creator membership
- [ ] Add create-board membership tests
- [ ] Add idempotent message send or duplicate-send protection

## Milestone 2 — Home and Browse Navigation

- [ ] Add joined-board query or endpoint
- [ ] Add browse-board query or endpoint
- [ ] Change Home to joined boards only
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

## Avoid adding all social features at once

Replies, mentions, reactions, unread counts, and notifications interact with one another. A useful implementation sequence is:

1. tests and reliability
2. Home/Browse navigation
3. unread state
4. notification center
5. user search
6. replies
7. mentions
8. reactions
9. optional discovery handles or links

