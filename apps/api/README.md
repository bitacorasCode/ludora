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
- Nodemailer for email; Mailpit captures local messages.
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
│   ├── mail/           # SMTP transport
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
| `PORT`                      | HTTP port; defaults to `3001`.                                                                                  |
| `DATABASE_URL`              | PostgreSQL connection string matching the local Compose database or deployed database.                          |
| `JWT_SECRET`                | Secret used by Nest to sign and verify access tokens.                                                           |
| `INTERNAL_API_SECRET`       | Exactly 64 hexadecimal characters, matching the web server's value. Authenticates forwarded client-IP metadata. |
| `EMAIL_VERIFICATION_SECRET` | Independent 64-character hexadecimal secret used to hash verification codes.                                    |
| `PASSWORD_RESET_URL`        | Trusted web reset-page URL without a query or fragment. Locally: `http://localhost:3000/reset-password`.        |
| `SMTP_HOST`                 | SMTP host; local Mailpit uses `127.0.0.1`.                                                                      |
| `SMTP_PORT`                 | SMTP port; local Mailpit uses `1025`.                                                                           |
| `SMTP_SECURE`               | Literal `true` or `false`; local Mailpit uses `false`.                                                          |
| `MAIL_FROM`                 | Sender identity used by email templates.                                                                        |

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
| `POST` | `/auth/forgot-password`     | Accepts `email`; acknowledges a valid request without revealing account existence or delivery status (`202`).           |
| `POST` | `/auth/reset-password`      | Accepts `token` and `password`; consumes the recovery link and updates the password (`200`).                            |
| `POST` | `/auth/change-password`     | Requires a verified JWT; accepts `currentPassword` and `password`; returns a replacement access token and user (`200`). |
| `GET`  | `/auth/me`                  | Returns the authenticated user and nullable `avatarPresetId`.                                                           |
| `GET`  | `/profile`                  | Returns the authenticated user's avatar preset and biography.                                                           |
| `PUT`  | `/profile`                  | Saves `avatarPresetId` and `bio` for the authenticated user.                                                            |

DTOs reject unexpected fields. Password confirmation belongs to the web form and
must not be sent in registration or password-reset bodies. Shared validation and
profile contracts live in `packages/security` and `packages/contracts`.

### Authentication and sessions

Passwords are sent to the API over HTTPS in production and hashed in Nest using
Argon2id. Password hashes are internal and never included in user responses.

Registration alone does not issue a JWT. Successful email confirmation signs the
user in. Login with correct credentials and an unverified email returns enough
information to resume verification without automatically sending another email.

The API issues 15-minute JWT access tokens. Next stores the token in its HttpOnly
session cookie and attaches the bearer header on server-to-server requests. Nest
does not read that cookie directly. The internal-request secret is separate from
user authentication and does not grant access to protected routes.

Each protected request verifies the JWT and checks the user's verified email and
current `authVersion` in PostgreSQL. Password recovery and authenticated password
changes increment this version, so previous tokens fail on subsequent protected
requests. Resetting a password does
not verify the email or issue a session. Logout currently clears the web cookie;
there is no API refresh-token or per-session revocation endpoint.

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
`PasswordNotificationService`, also used by password recovery. SMTP does not delay
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

Open Mailpit at `http://127.0.0.1:8025` to read local verification codes, recovery
links, and password-change notifications. Mailpit does not deliver to a real inbox.
SMTP uses port `1025`; port `8025` is the browser interface.

Verification and recovery credentials are stored as hashes. Registration and
resends contact SMTP after their database transaction commits. An account can
therefore exist even if sending its verification email fails; use resend instead
of registering it again.

Recovery requests return the same accepted response after validation and rate
limiting. Recovery processing and password-change notifications currently run in
memory; a process restart can lose pending work. Durable delivery and retries
will require a persistent job queue.

The current transport accepts host, port, secure mode, and sender settings. SMTP
username/password authentication is not implemented; adding environment variables
alone will not configure it. Integrate the chosen production mail provider before
relying on delivery outside Mailpit.

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
The deployment still needs its service configuration and production mail setup.

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
