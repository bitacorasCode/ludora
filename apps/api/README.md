# Ludora API

NestJS backend for Ludora. It owns authentication, email verification, password
recovery, and profile persistence in PostgreSQL. Next calls this API from its
server; Nest authorizes protected operations.

Start with the [monorepo setup](../../README.md) to install dependencies, configure
environment files, and start PostgreSQL and Mailpit. See
[ARCHITECTURE.md](./ARCHITECTURE.md) for repository responsibilities, transactions,
and authentication invariants, and the [web README](../web/README.md) for browser
flows and Playwright tests.

All commands below run from the repository root.

## Stack and structure

- NestJS with Express, TypeScript, and NodeNext ESM imports.
- Prisma ORM 7 with the PostgreSQL driver adapter and a generated TypeScript client.
- Zod DTOs validated through Nest's global `StandardSchemaValidationPipe`.
- Argon2id password hashing and JWT access tokens.
- Nodemailer for local SMTP email and Resend over HTTPS for real delivery.
- Vitest for unit tests and Supertest for the API smoke test.

```text
apps/api/
├── prisma/             # Schema and committed migrations
├── prisma7.config.ts   # Explicit Prisma CLI configuration
├── src/
│   ├── auth/           # Authentication, verification, and recovery
│   ├── common/         # Guards, exceptions, filters, and IP handling
│   ├── config/         # Rate-limit and deployment-specific IP rules
│   ├── generated/      # Generated Prisma client; do not edit manually
│   ├── mail/           # SMTP and Resend transports
│   ├── prisma/         # Client and connection lifecycle
│   ├── profile/        # Authenticated profile reads and writes
│   └── users/          # User services and persistence
└── test/               # API smoke test and local browser-test support
```

Controllers validate and delegate; services coordinate use cases; repositories
own Prisma queries. `PrismaService` manages the client and connection pool.
Repositories are internal to their modules. Other modules use public services
rather than importing one another's repositories.

## Environment

Use [`.env.example`](./.env.example) as the template for `apps/api/.env`. Nest loads
this file when launched through workspace commands. Prisma's explicit config also
loads this app's environment file. The root `.env` belongs to Docker Compose and
is not automatically the API configuration.

| Variable                    | Purpose                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `development` locally; `production` for a production deployment.                                                |
| `GOOGLE_CLIENT_ID`          | Google OAuth web application's client identifier.                                                              |
| `GOOGLE_CLIENT_SECRET`      | Server-only Google OAuth client secret.                                                                        |
| `GOOGLE_REDIRECT_URI`       | Exact registered callback URL in Next, such as `http://localhost:3000/api/auth/google/callback`.                  |
| `PORT`                      | HTTP port; defaults to `3001`.                                                                                  |
| `DATABASE_URL`              | PostgreSQL connection string matching the local Compose database or deployed database.                          |
| `JWT_SECRET`                | Secret used by Nest to sign and verify access tokens.                                                           |
| `INTERNAL_API_SECRET`       | Exactly 64 hexadecimal characters, matching the web server's value. Authenticates forwarded client-IP metadata. |
| `EMAIL_VERIFICATION_SECRET` | Independent 64-character hexadecimal secret used to hash verification codes.                                    |
| `PASSWORD_RESET_URL`        | Trusted web reset-page URL without a query or fragment. Locally: `http://localhost:3000/reset-password`.        |
| `MAIL_PROVIDER`             | Required provider selector: `smtp` for Mailpit or `resend` for real delivery. Independent of `NODE_ENV`.          |
| `SMTP_HOST`                 | SMTP host; local Mailpit uses `127.0.0.1`.                                                                      |
| `SMTP_PORT`                 | SMTP port; local Mailpit uses `1025`.                                                                           |
| `SMTP_SECURE`               | Literal `true` or `false`; local Mailpit uses `false`.                                                          |
| `MAIL_FROM`                 | Sender identity used by email templates.                                                                        |
| `RESEND_API_KEY`            | Server-only sending key required when `MAIL_PROVIDER=resend`; restrict it to the verified sending domain.        |

Generate and store secrets using the root setup instructions. Keep the JWT and
verification secrets independent from the shared internal-request secret. Never
commit environment files containing credentials.

Production password-reset links require HTTPS. HTTP is accepted only for loopback
hosts in development and tests. The reset URL comes from trusted configuration,
not a value supplied by the user.

## Run locally

With the database migrated and the Prisma client generated:

```bash
pnpm --filter api start:dev
```

The API normally listens at `http://localhost:3001`. Check database connectivity:

```bash
curl http://localhost:3001/health
```

The health response includes `status`, `database`, and `usersCount`. It queries the
database, so PostgreSQL must be running and migrations must be applied.

For a compiled run:

```bash
pnpm --filter api build
pnpm --filter api start:prod
```

## Prisma and migrations

This project uses `prisma7.config.ts`; include `--config` in Prisma commands.
The generated client lives in `src/generated/prisma`.

Generate the client after installing dependencies or changing the schema:

```bash
pnpm --filter api exec prisma generate --config prisma7.config.ts
```

Create and apply a schema migration against the local development database:

```bash
pnpm --filter api exec prisma migrate dev --config prisma7.config.ts --name describe_the_change
pnpm --filter api exec prisma generate --config prisma7.config.ts
```

Apply committed migrations to a prepared database, including during deployment:

```bash
pnpm --filter api exec prisma migrate deploy --config prisma7.config.ts
```

Inspect migration status or browse local data:

```bash
pnpm --filter api exec prisma migrate status --config prisma7.config.ts
pnpm --filter api exec prisma studio --config prisma7.config.ts
```

Commit schema changes together with their migration directories. Keep previously
applied migrations unchanged: their history reproduces the database. If Prisma
reports a modified migration or requests a reset, inspect the cause before
accepting data loss. A reset is not a routine setup or deployment step.

## HTTP endpoints

There is no global URL prefix. Bodies are JSON. Protected routes require
`Authorization: Bearer <access-token>`.

| Method | Path                        | Behavior                                                                                                                |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/`                         | Starter response: `Hello World!`.                                                                                       |
| `GET`  | `/health`                   | Checks database access and returns the user count.                                                                      |
| `POST` | `/auth/register`            | Accepts `nickname`, `email`, and `password`; creates an unverified account and returns verification metadata (`201`).   |
| `POST` | `/auth/verify-email`        | Accepts `verificationId` and `code`; confirms the email and returns an access token and user (`200`).                   |
| `POST` | `/auth/resend-verification` | Accepts `verificationId`; renews the code when allowed and returns delivery and retry information (`200`).              |
| `POST` | `/auth/login`               | Accepts `email` and `password`; returns an authenticated session or the pending-verification next step (`200`).         |
| `POST` | `/auth/refresh`             | Internal requests only. Accepts `refreshToken` and returns rotated credentials and session deadlines (`200`).          |
| `POST` | `/auth/logout`              | Internal requests only. Accepts `refreshToken` and revokes its session (`200`).                                            |
| `POST` | `/auth/google/start`        | Internal requests only; returns the Google authorization URL and expiring signed flow context (`200`).                |
| `POST` | `/auth/google/callback`     | Internal requests only; accepts `flowToken` and `responseParameters`; resolves sign-in or pending registration (`200`). |
| `POST` | `/auth/oauth/registration-context` | Internal requests only; validates `registrationToken` and returns its email context and expiration (`200`). |
| `POST` | `/auth/oauth/register`      | Internal requests only; accepts `registrationToken`, `nickname`, and optional `email`; creates the account and returns a session or verification metadata (`201`). |
| `POST` | `/auth/forgot-password`     | Accepts `email`; acknowledges a valid request without revealing account existence or delivery status (`202`).           |
| `POST` | `/auth/reset-password`      | Accepts `token` and `password`; consumes the recovery link and updates the password (`200`).                            |
| `POST` | `/auth/change-password`     | Requires a verified JWT; accepts `currentPassword` and `password`; returns a replacement access token and user (`200`). |
| `GET`  | `/auth/me`                  | Returns the authenticated user, nullable `avatarPresetId`, and boolean `hasPassword`; never returns a password hash.      |
| `GET`  | `/profile`                  | Returns the authenticated user's avatar preset and biography.                                                           |
| `PUT`  | `/profile`                  | Saves `avatarPresetId` and `bio` for the authenticated user.                                                            |

DTOs reject unexpected fields. Password confirmation belongs to the web form and
must not be sent in registration or password-reset bodies. Shared validation and
profile contracts live in `packages/security` and `packages/contracts`.

### Authentication and sessions

Passwords are sent to the API over HTTPS in production and hashed in Nest using
Argon2id. Password hashes are internal and never included in user responses.

Password registration alone does not issue a JWT. Successful email confirmation signs the
user in. Login with correct credentials and an unverified email returns enough
information to resume verification without automatically sending another email.

The API issues JWT access tokens with the shared `ACCESS_TOKEN_TTL_SECONDS`
lifetime. Next stores the token in its HttpOnly
session cookie and attaches the bearer header on server-to-server requests. Nest
does not read that cookie directly. The internal-request secret is separate from
user authentication and does not grant access to protected routes.

New JWTs include the ID of a persisted session. Each protected request verifies
the JWT and checks the session's ownership, expiration, revocation status, and
the verified user's current `authVersion` in PostgreSQL. Tokens issued before
session binding continue to use the user version check until expiration. Password
recovery and authenticated password changes increment this version, so previous
tokens fail on subsequent protected requests. Resetting a password does
not verify the email or issue a session.

`POST /auth/refresh` requires the internal request secret and the current refresh
token. The response includes `accessToken`, `refreshToken`, `idleExpiresAt`, and
`absoluteExpiresAt`, with `Cache-Control: no-store`. The API returns `409` with
`AUTH_REFRESH_TOKEN_ALREADY_ROTATED` for overlapping rotations and `401` for an
invalid or expired session. The web integration will manage cookie replacement
and coordinate overlapping refresh requests.

`POST /auth/logout` requires the internal request secret and accepts the refresh
token even after its access token expires. An already-rotated token can identify
the same session if logout overlaps with refresh. The endpoint returns
`{ "loggedOut": true }` for revocation, an already-revoked session, or an unknown
well-formed token. The existing web logout clears its cookie. The endpoint will
be used by the web logout when Next stores the refresh cookie.

### Google account resolution

The Google callback endpoint validates the authorization response and looks up the
stable provider identity. Linked accounts follow the same verified-email and JWT
rules as password login. An existing account with a matching email requires its
original sign-in method; it is never automatically linked to Google.

A new identity returns `nextStep: completeRegistration` and a short-lived
registration token so the next step can collect a nickname. No account is created
at this stage.

`POST /auth/oauth/register` validates that token and creates the user and provider
identity atomically. It returns `authenticated` and an access token when the
provider verified the email. Otherwise it returns `verifyEmail` and sends a
confirmation code using the existing mail flow. Email delivery occurs after
commit. An address supplied by the caller is accepted only when the provider
supplied none; a supplied copy of the provider address must match it.

Next handles Google's browser redirect at `/api/auth/google/callback`. Temporary
authorization and registration tokens stay in HttpOnly cookies. The completion
page calls `POST /auth/oauth/registration-context` through Next to validate the
pending token before displaying its email. Only Nest verifies these tokens; no
JWT signing secret is shared with the browser or Next.

Social accounts initially have no password. Account settings offer a creation
link through the existing email-based password recovery flow. The email uses
creation wording when no password exists. Submitting the link creates the password
and invalidates previous sessions, while Google sign-in remains available.
Explicit account linking and Discord sign-in are later steps.

### Changing a password while signed in

`POST /auth/change-password` checks the current password and requires a different
new password. The guard supplies the verified authentication version. A conditional
update checks that version and the password hash again, increments `authVersion`,
and invalidates pending reset links within the same transaction. Competing changes
cannot silently overwrite a newer credential.

The successful response contains a new access token for the same user. Next replaces
its HttpOnly cookie to keep this browser signed in; previous tokens are rejected.
An incorrect current password returns `400` with `AUTH_CURRENT_PASSWORD_INVALID`.
Reusing it returns `400` with `AUTH_PASSWORD_UNCHANGED`. These are form errors, not
expired-session responses. A stale authentication version returns `401`.

A password-change notice is scheduled after commit through
`PasswordNotificationService`, also used by password recovery. Email delivery does not delay
or undo the credential change. There is no email-change endpoint.

### Errors and rate limiting

Consumers use stable `errorCode` values, not English message text, to select UI
translations. Authentication definitions live in `auth/constants/auth-errors.ts`
and shared code identifiers in `packages/security`. Common database and rate-limit
errors live in `common/constants/errors.ts`. The global Prisma filter translates
unique-constraint conflicts into `409` responses, distinguishing nickname and email.

Authentication and profile controllers apply `RateLimitGuard`. Policies are defined
in `src/config/rate-limit.ts`; a `429` response includes `RATE_LIMIT_EXCEEDED` and
`retryAfterSeconds`. Verification and recovery also have per-account waiting
periods in PostgreSQL, independent of request limits by client IP.

Next can forward an authenticated, validated client IP. Direct local requests use
their socket IP; Render web-service requests have a separate platform-header path.
These rules live in `ClientIpService` and `InternalRequestService`. The internal
secret authenticates this metadata and does not replace the user's JWT.

The current throttler storage is in memory per API process. Multiple replicas
will need shared storage to enforce the same limits collectively.

## Email

`MailService.send()` is the common entry point for verification, recovery, and
password-change emails. At startup it validates `MAIL_PROVIDER` and only the
settings needed by that provider. Restart the API after changing environment
variables.

For local capture, use the configuration in `.env.example`:

```dotenv
MAIL_PROVIDER="smtp"
MAIL_FROM="Ludora <no-reply@ludora.test>"
SMTP_HOST="127.0.0.1"
SMTP_PORT="1025"
SMTP_SECURE="false"
```

Open Mailpit at `http://127.0.0.1:8025` to read verification codes, recovery links,
and password-change notifications. Mailpit does not deliver to a real inbox.
SMTP uses port `1025`; port `8025` is the browser interface.

For real delivery, verify `notifications.ludora.cl` in Resend and configure the
API environment with:

```dotenv
MAIL_PROVIDER="resend"
MAIL_FROM="Ludora <no-reply@notifications.ludora.cl>"
RESEND_API_KEY=""
```

Set the actual key only in the private API environment or the API host's secret
settings. Use a sending-only key restricted to the verified domain and separate
keys for development and production. Next does not need this key.

The Resend transport posts JSON to `https://api.resend.com/emails`, authenticates
with the bearer key, and requires both a successful HTTP response and a nonempty
submission ID. Network failures, timeouts, rejected requests, and invalid
responses fail the send operation. A submission ID confirms provider acceptance,
not inbox placement. Both transports use the configured 10-second timeouts;
the Resend request uses `AbortSignal.timeout()`.

Manage the sending domain's DNS through Cloudflare. Publish the SPF and DKIM
records generated by Resend. Configure DMARC Management for `ludora.cl`, using
the TXT record at `_dmarc.ludora.cl` and the `rua` destination generated by
Cloudflare. To let `notifications.ludora.cl` inherit this policy, remove the
initial monitoring-only TXT record at `_dmarc.notifications.ludora.cl` after
the parent policy is published. An explicit subdomain policy takes precedence
over the parent policy.

Start with `p=none` and inspect authentication results and aggregate reports
before tightening the policy. `p=none` requests no DMARC-specific quarantine or
rejection. Receiving email in an application inbox is a separate service from
sending email and from Cloudflare's DMARC report collection.

Verification and recovery credentials are stored as hashes. Registration and
resends contact the selected provider after their database transaction commits.
An account can therefore exist even if sending its verification email fails;
use resend instead of registering it again.

Recovery requests return the same accepted response after validation and rate
limiting. Recovery processing and password-change notifications currently run in
memory; a process restart can lose pending work. Durable delivery and retries
will require a persistent job queue.

SMTP username/password authentication is not implemented. The SMTP configuration
targets local Mailpit; real delivery uses Resend's HTTPS API.

## Tests and checks

Generate the Prisma client before checking a fresh checkout. Unit tests mock
persistence and external services; they do not require PostgreSQL or SMTP.

```bash
pnpm --filter api test
pnpm --filter api test:watch
pnpm --filter api test:cov
pnpm --filter api lint
pnpm --filter api build
```

Run a focused test file:

```bash
pnpm --filter api test src/auth/services/auth.service.spec.ts
```

The separate API smoke suite boots `AppModule` against the configured database
and requires valid API environment configuration:

```bash
pnpm --filter api test:e2e
```

It currently checks the starter `/` endpoint; it is not full authentication
integration coverage. Browser flows using the real API, PostgreSQL, and Mailpit
are exercised by [the web Playwright suite](../web/README.md).

`test/fixtures/auth-fixture.mjs` is local-only support for that suite. It only
operates on temporary `e2e-…@example.test` accounts in a loopback development
database and is never imported by the application. It can remove those accounts,
expire their recovery links, or create expired test JWTs. Run the browser suite
rather than using fixture operations against ordinary accounts.

## Deployment notes

The intended API/database host is Render, while Next runs separately on Vercel.
The deployment still needs its service configuration, production Resend
credentials, and delivery validation from the deployed API.

Install workspace dependencies, generate Prisma Client, build the API, apply
committed migrations with `migrate deploy`, and run
`pnpm --filter api start:prod`. Provide production environment variables on the
host, use the deployment database connection, and set `PASSWORD_RESET_URL` to the
public HTTPS web reset route. Both hosts need the same `INTERNAL_API_SECRET`;
JWT and verification secrets stay with Nest.

Verify client-IP handling, email delivery, and database access in the deployed
environment. Add shared rate-limit storage before scaling replicas and a
persistent mail queue when delivery must survive deployments. Database backup and
restoration procedures belong to deployment setup; local Compose volumes are not
a backup strategy.
