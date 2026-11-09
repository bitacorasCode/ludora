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

Account settings still display a preview email and a disabled change-password
action. The profile, registration, and authentication flows use the real API.

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
- `lib/session` manages the `HttpOnly`, `SameSite=Lax` session cookie. It also
  marks the cookie `Secure` in production. Tokens are not stored in local storage.
- Registration creates an unverified account. Successful verification creates
  the session; logging in with valid credentials for an unverified account
  returns the user to the verification flow.
- `getCurrentUser()` validates `/auth/me` and memoizes the result within the
  server render. Authentication failures return `null`; connection failures and
  invalid API responses remain errors rather than being treated as guest access.
- The account layout redirects guests to login. `SessionBoundary` and
  `useProtectedRequest` handle authentication failures during later client
  interactions by refreshing the server tree. Reads may opt into one retry;
  writes are not automatically repeated.
- Logout deletes the Next session cookie. It does not revoke copies of the JWT
  held elsewhere. Password reset invalidates previous JWTs through the API.

The recovery request returns a generic confirmation without exposing whether an
account exists. Reset links are validated on submission, are single-use, and
expire. The reset page uses `noindex` and `no-referrer` metadata. After a successful
reset, the web app removes the session cookie and returns to login; it does not
automatically sign the user in.

## Profile persistence

The profile displays validated per-user local storage while `GET /api/profile`
refreshes it. That handler calls Nest's authenticated `GET /profile` through the
Next server and returns a private, noncached response. The handler is a narrow
browser adapter; Nest remains the owner of the profile and its database access.

Editing becomes available after a successful server read. Saving uses a Server
Action that validates the form and checks that the session still belongs to the
displayed user before calling Nest's `PUT /profile`.

Only a successful server response updates the visible profile and browser cache.
A failed save leaves the entered values in the editor. Cache-write failures do
not turn a successful server operation into a failed save. Cache entries are
scoped by user ID and synchronize across tabs.

To check persistence manually, save a profile, delete only its
`ludora:profile:<user-id>` local storage entry, and reload. After the server read,
the same avatar and biography must appear. Browser storage is a convenience, not
the source of truth.

## Locales, themes, and navigation

Routing supports `en` and `es`, with English as the default. Use the navigation
helpers in `i18n/navigation` to preserve the locale. The language preference uses
the next-intl cookie; the theme preference uses next-themes browser persistence.
Their controls belong to the preferences feature.

Keep matching translation keys in `messages/en.json` and `messages/es.json`,
sorted alphabetically at every level. Group related labels under meaningful
objects and keep feature-specific errors with their feature. Code, comments,
documentation, and email templates use English; Spanish website copy belongs in
`es.json`.

`NavigationGuardProvider`, `GuardedLink`, and `useUnsavedChanges` share the
confirmation dialog for unsaved edits. Browser Back/Forward confirmation uses
Navigation API when supported and when the event is cancelable. Reloading or
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

Coverage reports are written to `apps/web/coverage`, including
`coverage/index.html`. Real navigation, layout, and browser lifecycle behavior
are covered by Playwright rather than jsdom alone.

### Browser tests

Authentication and profile scenarios use the real Nest API, local PostgreSQL,
and Mailpit. Complete the root setup and apply the existing migrations first.
Start Docker Desktop, then run from the monorepo root:

```bash
docker compose up -d
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

The API SMTP configuration must target Mailpit:
`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, and `SMTP_SECURE=false`.

Useful focused commands:

```bash
pnpm --filter web test:e2e e2e/email-verification.spec.ts --project=guest
pnpm --filter web test:e2e e2e/password-recovery.spec.ts --project=guest
pnpm --filter web test:e2e e2e/profile.spec.ts --project=signed-in
```

Playwright runs one worker. It starts Nest if the local API is unavailable and
launches an isolated web server and a test-only API proxy:

| Service               | Address                 |
| --------------------- | ----------------------- |
| Nest API              | `http://localhost:3001` |
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

Tests and manual requests share the running API's actual rate limits. Repeated
authentication runs can return `429`; respect the server's waiting period rather
than lowering application limits for the tests.

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
