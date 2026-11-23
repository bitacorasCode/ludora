# Ludora Web

The Ludora web application uses Next.js App Router, React, TypeScript,
next-intl, Tailwind CSS, and shadcn/ui. Nest owns the business API and PostgreSQL
persistence; Next provides the interface and the server boundary used by the
browser to access that API.

Start with the [monorepo README](../../README.md) to install dependencies,
configure the environment, start PostgreSQL and Mailpit, and apply migrations.
See the [API README](../api/README.md) for backend commands and configuration.

## Current scope

- Registration with email verification and verification-code resend.
- Login, logout, protected account routes, and recovery from an expired session.
- Password recovery and reset, including revocation of previous sessions.
- A persisted profile with preset avatars, an initial fallback, and a biography.
- English and Spanish interfaces, light and dark themes, and reusable form,
  feedback, navigation, and loading components.
- Games, ranking, and account activity pages with empty states. A playable game,
  matchmaking, chat, and competitive rankings are not implemented yet.

Account settings display the authenticated user's private, read-only email address
and allow changing the password. Email changes are not supported. The header shows
the user's nickname and a small circular profile avatar, falling back to an initial.

## Development commands

Run these commands from the monorepo root:

| Task                         | Command                           |
| ---------------------------- | --------------------------------- |
| Start development            | `pnpm --filter web dev`           |
| Build for production         | `pnpm --filter web build`         |
| Start the production build   | `pnpm --filter web start`         |
| Check lint rules             | `pnpm --filter web lint`          |
| Fix supported lint issues    | `pnpm --filter web lint:fix`      |
| Run unit and component tests | `pnpm --filter web test`          |
| Generate coverage reports    | `pnpm --filter web test:coverage` |
| Run browser tests            | `pnpm --filter web test:e2e`      |

Development and production servers use port `3000` by default. The API normally
runs separately on `3001`. `start` requires a successful `build` first.

To generate the Next route types and run TypeScript without creating a build:

```bash
pnpm --filter web exec next typegen
pnpm --filter web exec tsc --noEmit
```

## Environment

Copy [`.env.example`](.env.example) to `.env.local` inside `apps/web` and follow
the shared-secret instructions in the root README.

| Variable              | Purpose                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `API_URL`             | Origin of the Nest API. Local development uses `http://localhost:3001`; production requires HTTPS.                  |
| `INTERNAL_API_SECRET` | The same 64-character hexadecimal secret configured in the API. Next uses it for trusted server-to-server requests. |

Both variables are server-only. Do not prefix them with `NEXT_PUBLIC_` or import
their configuration into Client Components. The shared secret and the user's
JWT are attached to requests from the Next server to Nest, not to browser
requests.

The API URL rejects credentials and unsupported protocols. HTTP is allowed only
for loopback hosts in development and tests. Next manages `NODE_ENV`; Vercel
provides `VERCEL` in its environment. In production on Vercel, the API client
forwards the validated platform client IP together with the internal secret.

## Source organization

```text
src/
├── app/
│   ├── [locale]/        # Localized pages, layouts, loading and error boundaries
│   │   ├── (auth)/      # Auth route group; does not add a URL segment
│   │   ├── _components/ # Components owned by the localized application shell
│   │   └── account/     # Protected account pages
│   ├── _providers/      # Application providers
│   └── api/profile/     # Browser-facing profile read handler
├── components/          # Shared presentation and interaction components
├── config/              # App-owned route, environment, theme, and form catalogs
├── features/            # Feature UI, hooks, actions, validation, and API adapters
├── hooks/               # Reusable client hooks
├── i18n/                # Locale routing, request configuration, and navigation
├── lib/                 # API, auth, session, storage, validation, and utilities
└── messages/            # en.json and es.json
```

Keep route-specific orchestration in `app`, feature behavior in its feature,
and reusable presentation in `components`. Export a feature's public interface
from its root `index.ts`; keep internal dependencies direct to avoid circular
imports. Server-only modules use `server-only` and must stay out of client import
graphs.

## Branding

The logo artwork and its light and dark palettes live in
[`ludora-logo.tsx`](src/components/branding/ludora-logo.tsx). The header renders
the component directly. The favicons and standalone logos in `public/branding`
are generated from the same component.

After updating the artwork or palette, run the following from the monorepo root:

```bash
pnpm --filter web branding:generate
```

Commit the regenerated SVGs with the source change. The production build also
regenerates them before running Next.

## Authentication and API access

The normal request path is:

```text
Browser → Next Server Action or Route Handler → Nest API → PostgreSQL
```

Forms use React Hook Form and Zod for client validation. Server Actions validate
again, call the server-only API client, and validate the API response before
changing the session or reporting success. Nest also validates input and checks
authorization on protected operations.

- `lib/api` provides public and authenticated JSON clients. The authenticated
  client reads the session on the server and adds the bearer token.
- `lib/session` stores the access and refresh tokens in separate `HttpOnly`,
  `SameSite=Lax` cookies. Both are `Secure` in production, where the refresh
  cookie uses the `__Host-` prefix. The refresh cookie expires at the absolute
  deadline returned by Nest.
- Registration creates an unverified account. Successful verification creates
  the session; logging in with valid credentials for an unverified account
  returns the user to the verification flow.
- `getCurrentUser()` validates `/auth/me` and memoizes the result within the
  server render. It awaits `io()` before session access so validation runs on an
  actual request, outside build-time and runtime prerenders. With partial
  prefetching, cookies can resolve during a runtime prerender; cookie access alone
  does not defer later clock-dependent work. Authentication failures return `null`;
  connection failures and invalid API responses remain errors rather than being
  treated as guest access.
- Account navigation and section headings render while access is verified.
  Public content such as preferences and the activity empty states can render
  immediately. Place private data behind `AccountAccess` and a local `Suspense`
  boundary. Use the same fallback for that region during renewal. If the browser
  has a refresh cookie but lacks a valid access token, it attempts renewal on the
  requested page. Temporary failures show a retry control. Requests without
  recoverable credentials redirect to login.
  If the shared header still shows an authenticated user on login, it requests
  a fresh server render once to update both desktop and mobile links.
- Home renders immediately and attempts session recovery in the background
  when the access token is invalid and a refresh cookie remains. The header
  reflects the recovered user after renewal. Guest-only pages wait for the
  same recovery before displaying content that requires guest access. Pass the
  visible region or its skeleton as `fallback` to `GuestOnly` so the initial wait
  and renewal share the same UI.
  A valid session follows the page's redirect, and an expired session can
  proceed as a guest.
- During client interactions,
  `SessionBoundary` shares one refresh attempt for authentication failures on
  the same page. A Server Action replaces both cookies after a successful
  rotation. `useProtectedRequest` retries the original operation once after
  a confirmed authentication rejection. Use a rejection code before committing
  any changes, and bind mutations to the user who initiated them. Timeouts and
  other uncertain outcomes leave the original result in place.
  An explicitly invalid refresh token clears the cookies. Rotation conflicts
  and service failures preserve the cookies and return actionable feedback.
- Browser calls that write session cookies share a Web Lock across tabs on the
  same origin. This covers refresh, activity, logout, password login, email
  confirmation, completion of social registration, password reset, and password
  change. A protected mutation releases the lock before attempting recovery and
  reacquires it for the retry. A waiting refresh checks the current access cookie
  and reuses it when Nest confirms it is valid. The Google OAuth callback is a
  server-handled navigation outside this lock. Browsers without Web Locks fall
  back to the API's rotation conflict handling.
- Creating or ending a session also updates a separate revision cookie that
  contains a random value. Open tabs use a local storage notification to
  recheck this revision and refresh the current route, including both menus.
  Returning to a tab checks the revision as well. Nest remains responsible
  for authenticating the request, and routine credential rotation does not
  advance the revision.
- Pointer and keyboard interactions in a visible account tab report session
  activity at most once every five minutes while the account stays mounted.
  A successful report can rotate credentials when the access token has at most
  ten minutes left. If early renewal fails, the browser keeps its current
  cookies. If the access token has already expired, the report can use shared
  session recovery and retry once. Opening a tab or rotating credentials alone
  leaves the idle deadline unchanged.
- Logout asks Nest to revoke the session before expiring both cookies. It uses
  the refresh token when present and the access JWT when the refresh cookie is
  missing. If the access JWT is absent or rejected, the browser clears its
  cookies locally. Service failures preserve the cookies and allow retrying.
  Password reset and authenticated password changes invalidate previous
  credentials through the API.

Server-side handlers around request APIs and `fetch` use Next's `unstable_rethrow`
before logging or mapping application errors. This preserves framework control
flow for prerendering, redirects, and missing routes; those signals are not API
outages or expired sessions.

Tests cover replacement and removal of both cookies, a single retry after
confirmed authentication rejection, and header updates on login and logout
across tabs. Deferred coverage includes matching skeletons during route loading
and session renewal, session reads during partial prefetching, early renewal on
activity, concurrent cookie writes during refresh or password change, logout
during refresh or without a refresh cookie, and failed renewals that preserve
the current cookies.

The recovery request returns a generic confirmation without exposing whether an
account exists. Reset links are validated on submission, are single-use, and
expire. The reset page uses `noindex` and `no-referrer` metadata. After a successful
reset, the web app removes both session cookies and returns to login; it does not
automatically sign the user in.

### Google sign-in and registration

Login and registration share the Google authorization entry point. A Server Action
requests the authorization URL from Nest and saves the signed flow token, expected
state, and locale in an HttpOnly cookie before redirecting to Google. Configure
Google's authorized redirect URI to match `GOOGLE_REDIRECT_URI` in the API; locally
it is `http://localhost:3000/api/auth/google/callback`.

The callback Route Handler checks browser state before consuming the flow cookie
and asks Nest to validate the authorization response. A linked account receives
the normal session or resumes pending email verification. A new identity receives
a separate registration cookie and goes to `/complete-registration` to choose a
username. Nest validates that pending token before the page displays its email
context and validates it again when the form is submitted.

Provider email addresses cannot be edited during registration. If the provider
supplies no email, the form collects one and Ludora verifies it. A provider-verified
address permits immediate sign-in after account creation. Matching an existing
account's email never links accounts automatically; the user must use the original
sign-in method. Explicit linking and Discord sign-in are not implemented yet.

Temporary tokens stay on the server side of browser JavaScript in HttpOnly
cookies, use the API's expiration, and never enter query parameters or client
component props. Production cookies are Secure and use the `__Host-` prefix;
deletion preserves their Secure and path attributes. Callback redirects are local,
noncached, and suppress referrers. Errors return to localized login with safe error
metadata for the existing toast presentation. A callback with a missing or
mismatched state leaves the active authorization cookie intact.

Focused callback tests cover mismatched state, HttpOnly session and registration
cookies, and localized redirects without exposing tokens. Google consent and
provider responses are mocked; these checks do not replace a real provider flow.

## Account settings

The account settings page reads the authenticated user on the server. The email
address is displayed without an edit control and is not exposed on the profile.

The API's `hasPassword` capability determines the password action. Accounts with
a password keep the change-password form. Accounts without one, including new
Google accounts, see **Create password** instead. Its Server Action verifies that
the session still belongs to the displayed user and requests the existing recovery
flow using the email from that session; the browser cannot choose the recipient.
The request does not change credentials or end the session. Its acknowledgement
does not guarantee email delivery, and existing cooldowns and rate limits apply.

The email link uses the existing reset page, which also accepts signed-in users.
Its `mode` query parameter selects creation or reset wording for the button,
pending state, error title, and success feedback. This is presentation context
only: submitting the password still requires a valid, unexpired, single-use token
and does not send the mode to the API. Missing or unknown modes preserve the reset
wording, including previously sent links that contain only a token.
Successful submission establishes the password, invalidates previous JWTs through
the API, clears this browser's session, and returns to login. Google sign-in remains
available, and subsequent account visits offer **Change password**.

Changing a password requires the current password, a different new password, and
confirmation. Client and Server Action validation use the shared password minimum.
The action binds the operation to the displayed user, sends only `currentPassword`
and `password` to `POST /auth/change-password`, validates the returned user ID,
and stores the new JWT in the HttpOnly cookie. The token is never returned in the
action result.

An incorrect current password is a field error and keeps the form and session
available. Authentication failures use the shared session boundary; other failures
use the error toast, including the server's retry period. Success clears and closes
the editor, refreshes server content, and leaves this browser signed in. Previous
JWTs and pending password-reset links are invalidated by the API. Unsaved edits
use the shared navigation confirmation and are cleared when the page is hidden.

Focused tests cover both password actions, binding creation requests to the session
user and email, existing session/error handling, and creation/reset labels and
success feedback. Current-user fixtures include `hasPassword`; legacy and unknown
link modes retain reset wording. No real email is sent by these unit/component tests.

## Profile persistence

The profile page reads Nest's authenticated `GET /profile` directly from the
Next server after account access is verified. The existing `Suspense` boundary
keeps the heading and account navigation visible during the read. The browser
uses the server result on mount and calls `GET /api/profile` only for a retry.
That handler still returns a private, noncached response and uses the usual
session recovery for expired credentials.

Keep one `useProfile` instance per profile view. The editor receives the shared
save callback; it does not fetch another copy of the profile. `useRequestScope`
invalidates obsolete responses when the view is hidden or an editor is reopened.

Editing becomes available after a successful server read. The save action
validates the form and sends `expectedUserId` to Nest with `PUT /profile`. Nest
authorizes the JWT and compares its user ID with the one supplied by the editor
before writing. This check happens in a single API request. Deploy the matching
API version before this web version.

Only a successful server response updates the visible profile after a save.
The saved preferences are published to open profile tabs through a local storage
entry scoped by user ID. The initial render uses the server snapshot even when an
older local entry exists. A failed save leaves the entered values in the editor.
A failed storage write leaves the saved profile visible in the current tab. A
successful save also refreshes the server tree so the header displays the saved
avatar.

To check persistence manually, save a profile, delete only its
`ludora:profile:<user-id>` local storage entry, and reload. After the server read,
the same avatar and biography must appear. Browser storage is a convenience, not
the source of truth.

Profile coverage checks server-rendered data during hydration, absence of an
initial browser read, explicit retry, and synchronization after a save.
Save-action coverage for the request payload and API coverage for rejection after
an account switch are deferred until requested.

## Locales, themes, and navigation

Routing supports `en` and `es`, with English as the default. Use the navigation
helpers in `i18n/navigation` to preserve the locale. The language preference uses
the next-intl cookie; the theme preference uses next-themes browser persistence.
Their controls belong to the preferences feature.

`app/global-not-found.tsx` renders the shared English 404 for unmatched URLs.
An `afterFiles` rewrite prefixes missing root-level paths containing a dot
with the default locale for routing. This prevents `[locale]` from treating
the filename as a locale and leaves the requested URL unchanged.

Keep matching translation keys in `messages/en.json` and `messages/es.json`,
sorted alphabetically at every level. Group related labels under meaningful
objects and keep feature-specific errors with their feature. Code, comments,
documentation, and email templates use English; Spanish website copy belongs in
`es.json`.

`ContentDialog` in `components/overlays` provides a reusable modal shell without
form or navigation logic. `GuardedContentDialog` adds navigation-guard
confirmation when closing an editor. Wrap cancel buttons in
`ContentDialogClose` so they follow the same guarded close path as Escape,
the close icon, and outside clicks. Forms register dirty state with
`useUnsavedChanges`; successful saves can close the controlled dialog directly.

`NavigationGuardProvider` and `useUnsavedChanges` share the confirmation dialog
for unsaved edits, including attempts to close profile and password dialogs.
Navigation links use the locale-aware `Link` directly; the modal dialogs prevent
interaction with the underlying page while editing. Browser Back/Forward
confirmation uses Navigation API when supported and when the event is cancelable. Reloading or
closing a dirty editor uses the browser's native `beforeunload` warning; the
listener is removed when no unsaved changes remain. Browser restrictions mean
these warnings cannot guarantee delivery in every browser or mobile lifecycle.

Cache Components is enabled. Next can preserve a hidden page instead of
unmounting it, so transient editors, subscriptions, and pending requests must
handle Activity hide/show cleanup. In browser tests, use visibility-aware role
queries so a preserved hidden page does not satisfy an assertion by accident.

## Testing

### Unit and component tests

Vitest runs `src/**/*.test.{ts,tsx}` in jsdom with React Testing Library.
`test/setup.ts` supplies browser API stubs and mocks the `server-only` marker;
Next still enforces the actual server/client boundary in the application build.

Run a targeted suite with a path relative to `apps/web`:

```bash
pnpm --filter web test src/components/navigation/navigation-guard-provider.test.tsx
```

If a dependency upgrade leaves stale imports in Vitest's module cache, clear
it with `pnpm --filter web exec vitest --clearCache`.

Coverage reports are written to `apps/web/coverage`, including
`coverage/index.html`. Real navigation, layout, and browser lifecycle behavior
are covered by Playwright rather than jsdom alone.

### Browser tests

Browser navigation coverage includes the shared English 404 for unknown
localized routes and missing root-level files.

Authentication and profile scenarios use the real Nest API, local PostgreSQL,
and Mailpit. Complete the root setup and apply the existing migrations first.
Start Docker Desktop, then run from the monorepo root:

```bash
docker compose up -d
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

Playwright configures the test API to send mail to Mailpit and puts the browser
test origin in password reset links. The test API uses a local database.

Useful focused commands:

```bash
pnpm --filter web test:e2e e2e/email-verification.spec.ts --project=guest
pnpm --filter web test:e2e e2e/password-recovery.spec.ts --project=guest
pnpm --filter web test:e2e e2e/profile.spec.ts --project=signed-in
pnpm --filter web test:e2e e2e/user-settings.spec.ts --project=signed-in
```

Playwright runs one worker. Each run starts a dedicated Nest process, an isolated
web server, and a test-only API proxy. Each scenario uses its own simulated
client IP with the real rate limiter, so earlier scenarios cannot exhaust its
request allowance.

| Service               | Address                 |
| --------------------- | ----------------------- |
| Nest test API         | `http://localhost:3101` |
| Browser test web app  | `http://localhost:3100` |
| Test API proxy        | `http://127.0.0.1:3102` |
| Mailpit inbox and API | `http://localhost:8025` |

The test web app uses `.next-e2e`, separate from the normal `.next` build. The
proxy allows tests to simulate API failures and delays without changing
application code. `LUDORA_E2E` is set by Playwright for the output directory;
`PLAYWRIGHT_CHANNEL` can select an installed browser channel.

Fixtures create unique `e2e-<uuid>@example.test` accounts. Cleanup removes only
those accounts and their captured messages; it does not clear the database or
the Mailpit inbox. The account fixture requires a local PostgreSQL connection
and a valid temporary recipient.

The resend test observes the real server cooldown, which takes about one minute.
It reads the code from Mailpit and checks that the `HttpOnly` cookie appears only
after verification. Password recovery tests cover reset-token reuse, expiry,
session revocation, and the password-change notice. Profile tests check server
persistence after clearing browser cache, cross-tab updates, navigation, and
cancelled edits.
Account settings tests cover the read-only email, dirty-editor cancellation,
current-password rejection, session renewal, and invalidation of old JWTs. The
password-change scenario restores only its temporary test account afterward.

The signed-in fixture reuses a verified temporary account and creates a fresh
session per test. It installs both credential cookies using the deadlines
returned by the API, so a rotation or revocation cannot affect a later test.

Open the report after a run:

```bash
pnpm --filter web exec playwright show-report playwright-report
```

The HTML report is in `apps/web/playwright-report`; failure artifacts are in
`apps/web/test-results`. Sensitive authentication, verification, and password
recovery suites disable traces and screenshots. Treat other browser artifacts
as potentially containing account data and keep them out of Git.

## Production

The intended web host is Vercel, with `apps/web` as its project root. Configure
the server-only API origin and internal secret separately in each deployment
environment. See the root README for the planned Vercel/Render deployment split
and the API README for the backend configuration.

Before releasing, run the build and checks against the deployed HTTPS setup,
including registration email delivery, session cookies, protected redirects,
profile persistence, and recovery links that point to the deployed web origin.
