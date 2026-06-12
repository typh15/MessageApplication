

# GitHub Issue Workplan

This document summarizes the current GitHub issues, what they appear to mean for the project, and the implementation details that are worth keeping in mind. It is intended as a planning aid before continuing frontend work.







## Issue #2: User Account System Refactor

**Goal:** Separate the app’s internal chat/session identity from optional user-facing account data. The app should continue to support anonymous users through `ActiveUser`, while also allowing a modular `Account` layer that can later plug into OAuth or another third-party identity provider.

**Current state:** The backend uses `ActiveUser` and `IActiveUserRepository` as the source of identity. Users register with a username and receive a local `uniqueId`. The frontend stores that `uniqueId` in local storage. Because the backend repository is currently in-memory, stale `uniqueId` values can exist on the client after the API restarts, so the frontend validates saved IDs against `/active-users/validate`.

**Recommended backend direction:** Keep `ActiveUser` as the core app/session identity used by boards, messages, invites, and requests. Add a separate `Account` model and `IAccountRepository` that link to `ActiveUser` by `uniqueId`.

Suggested shape:

ChatService
  -> ActiveUserRepository
  -> AccountService
       -> AccountRepository
       -> AccountProvider(s)







## Issue #3: Private Board UX

**Goal:** Support the three private-board entry paths:

1. Enter board ID plus password and join directly.
2. Enter board ID and request access, then wait for approval.
3. Receive an invitation and accept it.

**Current backend state:** The core backend flows are now present.

- Direct code/password join: `POST /message-boards/join-by-code`
- Legacy request access: `POST /message-boards/search`
- View board requests: `GET /message-boards/{boardId}/requests`
- Approve request: `POST /message-boards/{boardId}/approvals`
- Invite user: `POST /message-boards/{boardId}/invites`
- View my invites: `GET /active-users/{uniqueId}/invites`
- Accept invite: `POST /message-boards/{boardId}/invites/accept`
- Reject invite: `POST /message-boards/{boardId}/invites/reject`

Important behavior:

- Public boards appear in the normal board list.
- Private boards appear in the normal board list only after the user joins.
- Private password-protected boards can be joined directly with `uniqueBoardId + password`.
- Private non-password boards should not be directly joinable by numeric `boardId`; they should require request approval or invitation.
- When a user becomes a member, pending request/invite state should be cleaned up so the same user does not remain in both queues.

Frontend implications:

- The board list should show public boards and private boards the user has joined.
- The private-board join UI needs two modes:
  - Join with board code and password.
  - Request access with board code.
- Chat or board details should expose an invite-user flow for existing members.
- A user account page should show pending invites.

Acceptance checks:

- User can join a private password-protected board using only `uniqueBoardId`, password, and their `uniqueId`.
- User cannot directly join a private non-password board through `/message-boards/{boardId}/join`.
- Invited user sees pending invite.
- Accepting invite adds user to board and removes invite.
- Approving a request adds user to board and removes request.
- Accepting an invite or approving a request clears any duplicate pending state in the other list.







## Issue #4: Basic User Account Page Frontend Setup

**Goal:** Add a simple account page accessible from the main app flow.

Expected content:

- Current username.
- Avatar or placeholder identity display.
- Pending invites list.
- Accept/reject invite controls.

Backend endpoints already available:

- `GET /active-users/{uniqueId}/invites`
- `POST /message-boards/{boardId}/invites/accept`
- `POST /message-boards/{boardId}/invites/reject`

Frontend notes:

- The page should validate the saved `uniqueId` before loading user-specific data.
- Pending invite actions should disable or block duplicate taps while a request is in flight.
- After accepting an invite, the board list should refresh or the user should be routed into the joined board.

Acceptance checks:

- User can open the account page from the main boards/chat flow.
- Pending invites render with board name and board ID/code.
- Accepting an invite removes it from the list.
- Rejecting an invite removes it from the list.
- Stale/missing `uniqueId` redirects back to registration.







## Issue #5: Dedicated Web Server Deployment

**Goal:** Deploy the web client to an always-on environment with an automated pipeline.

Issue notes mention:

```bash
npx expo export --platform web
eas deploy --platform web
```

Suggested work:

- Confirm the web build succeeds locally.
- Decide where the API will run and whether the frontend server URL should be configurable.
- Add a GitHub workflow that builds the web app on push.
- Add EAS deployment once credentials/project configuration are ready.

Important dependency:

- The client currently uses a hardcoded server URL in `ApiHandler.tsx`. Deployment will be cleaner if this becomes configuration.

Acceptance checks:

- Web export completes.
- Deployment command works manually.
- GitHub workflow runs on push.
- Deployed web app can reach the API.







## Issue #6: Track Requests On Client Side

**Goal:** Prevent quick repeated taps from sending duplicate or conflicting requests.

Recommended frontend behavior:

- Disable buttons while the current request is in flight.
- Alternatively, track a request ID and ignore responses from older requests once a newer one is sent.

Best first implementation:

- Use per-action loading flags.
- Disable related buttons during the request.
- Clear the flag in `finally`.

Places this matters:

- Register/login.
- Create board.
- Join board.
- Request access.
- Invite user.
- Accept/reject invite.
- Approve request.
- Send message.

Acceptance checks:

- Double-clicking/tapping action buttons does not submit duplicate requests.
- UI re-enables after success or error.
- Errors are still visible to the user.







## Issue #7: Sort, Filter, Search Functionality

**Goal:** Add reusable list controls for sorting, filtering, and searching.

Targets:

- Message boards: sort by name and date created.
- Users: search by username.
- Potentially invites/requests: filter pending state.

Backend note:

- Sorting by date created requires board creation time in the backend model/response. Currently the board response does not appear to include a creation timestamp.

Suggested approach:

- Start frontend-only for fields already available, such as board name.
- Add `CreatedAt` to `MessageBoard` and `MessageBoardDataResponse` when date sorting is needed.
- Build generic frontend helpers/components that accept data, a search string, filters, and a sort mode.

Acceptance checks:

- Board list can search by name.
- Board list can sort alphabetically.
- Date sorting works only after the backend exposes a creation timestamp.
- User invite/search input can filter usernames.







## Issue #8: Clean Up / Refactor Frontend Components And Styles

**Goal:** Reduce duplicated UI patterns and make frontend styling easier to maintain.

Likely targets:

- Repeated loading/error/empty states.
- Repeated button styling.
- Repeated board/request/invite cards.
- Repeated `AsyncStorage` `uniqueId` validation logic.
- API error handling in `ApiHandler.tsx`.

Suggested cleanup sequence:

1. Centralize `uniqueId` loading/validation helpers.
2. Add reusable loading/error/empty components.
3. Extract board/invite/request card components.
4. Normalize API handler method names and return shapes.
5. Move repeated spacing/color styles into shared theme helpers.

Acceptance checks:

- No duplicated uniqueId validation blocks across screens.
- API handler methods have consistent names and errors.
- Shared UI components cover common list states.
- Existing registration, boards, chat, invites, and request flows still work.

## Cross-Cutting Notes

The backend is currently in-memory. This is fine for local iteration, but it explains several testing behaviors:

- API restart clears users and boards.
- Client storage can contain stale `uniqueId` values.
- Invites and requests disappear on API restart.

Before deployment or longer testing sessions, the project will need persistence or a deliberate reset/dev-mode story.

Current backend build status as of this note: `dotnet build` passes with zero errors.
