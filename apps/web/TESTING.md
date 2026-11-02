# Ludora tests

Vitest tests live alongside the source code and use `describe` and `it`, Testing Library, and Spanish messages when checking localized UI behavior. Browser tests live in `e2e/`.

## Components, logic, and coverage

From the monorepo root:

```sh
pnpm --filter web test
pnpm --filter web test:coverage
```

The second command generates `apps/web/coverage/index.html` and `coverage-summary.json`.
The report includes source code even when no test imports it. It excludes tests, type declaration files, and index files that only re-export modules. UI components remain included.

Coverage is measured by Vitest. Playwright reports browser flows separately, so a page covered by browser tests may appear with 0% coverage in the Vitest report.

Covered areas:

- Storage: reading, writing, deletion, subscriptions, changes across tabs, and browser errors.
- Profile: schema, corrupt JSON, hydration, editing, avatars, cancellation, asynchronous saving, and persistence failures.
- Preferences: theme and language selection, preserving query parameters and URL fragments.
- Navigation: session-dependent links, active sections, access decisions, and redirects.
- Registration: Server Action validation and the locale used to translate errors.
- Authentication: login and logout actions, pending states, translated errors, cookies, and current-user lookup.
- HTTP client: per-request tokens, reserved headers, network failures, invalid responses, and HTTP/HTTPS policy.
- Shared components: alerts, error states, lists, and accessible textareas.

Guard tests invoke the server function and check its redirect decision. Asynchronous route rendering is checked in the browser.

`test/setup.ts` supplies the sizing and pointer-capture APIs missing from jsdom. Playwright checks geometry, actual focus behavior, and persistence after reloading.

## Browser tests

Install Chromium once:

```sh
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

You can also use Chrome installed on your computer:

```sh
PLAYWRIGHT_CHANNEL=chrome pnpm --filter web test:e2e
```

These flows require PostgreSQL and the local configuration in `apps/api/.env` (`DATABASE_URL` and `JWT_SECRET`). From the repository root, start PostgreSQL with `docker compose up -d` and apply the API migrations if you have not done so yet.

Playwright uses:

| Service | Port | Purpose |
| --- | --- | --- |
| Nest API | 3001 | Reuses the local API when it is running; otherwise starts it. |
| Test proxy | 3102 | Forwards requests to Nest and can simulate delays or disconnections. |
| Test Next.js app | 3100 | Uses the separate `.next-e2e/` directory. |

The `signed-in` and `guest` projects share this Next server. Sessions use cookies containing JWTs issued by the real API; there are no authentication aliases or access booleans.

Each worker creates a temporary account through `/auth/register`, using an `e2e-<uuid>@example.test` email address. It deletes the account afterward with a parameterized query that requires its exact ID and email address. The `apps/api/test/fixtures/auth-fixture.mjs` helper also generates an expired token to check that Nest rejects it; it reads local configuration without printing secrets. These tests are designed for the local development database.

The scenarios check successful and unsuccessful login, the HttpOnly cookie, persistence after reloading, logout without a full page reload, access after logout, guest redirects, actual JWT expiration, and connection failures. They also cover mobile navigation, language, theme, 404 pages, and profile synchronization across tabs. Each test uses independent cookies and storage.

Disconnections are simulated only in the test proxy: the developer's API is neither stopped nor modified. The proxy returns to normal mode after each test.

The server runs `next dev`. Next's `instant` checks may show development warnings when executing redirects or `notFound()`. For final release validation, repeat the flows against a production build.

Failures generate screenshots and traces in `test-results/`. The HTML report is saved in `playwright-report/`:

```sh
pnpm --filter web exec playwright show-report
```
