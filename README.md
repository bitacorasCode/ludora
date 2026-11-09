# Ludora

Ludora is an online board game platform under development. The current application
provides email-verified registration, login and logout, password recovery, and a
persistent user profile. Account settings show a read-only email and support
authenticated password changes. The game catalog, ranking, and activity pages currently
show empty states; playable games and multiplayer rooms are upcoming work.

## Workspace

| Path                     | Purpose                                                  | Documentation                                                                  |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/web`               | Next.js App Router frontend                              | [Web README](apps/web/README.md)                                               |
| `apps/api`               | NestJS API with Prisma and PostgreSQL                    | [API README](apps/api/README.md), [API architecture](apps/api/ARCHITECTURE.md) |
| `packages/contracts`     | Shared profile contracts and validation rules            | [Package exports](packages/contracts/package.json)                             |
| `packages/security`      | Shared authentication constants and validation utilities | [Security README](packages/security/README.md)                                 |
| `packages/eslint-config` | Shared ESLint rules                                      | [ESLint README](packages/eslint-config/README.md)                              |

The repository uses pnpm workspaces. Run the commands below from the monorepo root
unless a section explicitly says otherwise. The root guide owns the shared local
setup; each application README documents its implementation and specific workflows.

## Prerequisites

- Node.js 24, the development baseline used by this project.
- pnpm `10.15.1`, as declared in `package.json`.
- Docker with the Docker Compose plugin, with the Docker engine running.

## First local setup

### 1. Install dependencies and create local environment files

```bash
pnpm install --frozen-lockfile
cp -n .env.example .env
cp -n apps/api/.env.example apps/api/.env
cp -n apps/web/.env.example apps/web/.env.local
```

The copy commands leave existing local files intact. Environment files containing
credentials are ignored by Git; only the example files belong in version control.

| File                  | Loaded by                 | Contents                                                                |
| --------------------- | ------------------------- | ----------------------------------------------------------------------- |
| `.env`                | Docker Compose            | PostgreSQL database name and credentials                                |
| `apps/api/.env`       | NestJS and the Prisma CLI | Database URL, JWT and verification secrets, SMTP settings, recovery URL |
| `apps/web/.env.local` | Next.js                   | API URL and internal request secret                                     |

The root `.env` is not automatically loaded by the two applications. They can run
as independent deployments, so each app owns its environment configuration.

Configure `apps/api/.env` with a `DATABASE_URL` matching the PostgreSQL values in
the root `.env`. With the unchanged development example values, the URL is:

```dotenv
DATABASE_URL=postgresql://ludora:ludora_dev_password@localhost:5432/ludora?schema=public
```

Generate a secret locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use separate generated values for `JWT_SECRET`, `EMAIL_VERIFICATION_SECRET`, and
`INTERNAL_API_SECRET` in `apps/api/.env`. Copy only `INTERNAL_API_SECRET` into
`apps/web/.env.local`: that value must match between the two servers and contain
64 hexadecimal characters. The web application does not need the JWT signing
secret or the verification secret. Keep these variables server-only, without a
`NEXT_PUBLIC_` prefix.

The API example already targets local Mailpit and uses
`PASSWORD_RESET_URL=http://localhost:3000/reset-password`. Password reset links use
this configured web address; change it when running the frontend on another port.

### 2. Start PostgreSQL and Mailpit

```bash
docker compose up -d
docker compose ps
```

Compose starts only PostgreSQL and Mailpit. Run the web app and API directly with
pnpm during development.

### 3. Generate Prisma Client and apply existing migrations

```bash
pnpm --filter api exec prisma generate --config prisma7.config.ts
pnpm --filter api exec prisma migrate deploy --config prisma7.config.ts
```

The API uses Prisma ORM 7 and the explicitly named `prisma7.config.ts` file. Keep
the existing migration history in Git. For schema changes, use the development
migration workflow described in the [API README](apps/api/README.md#prisma-and-migrations).

### 4. Run the applications

Start the API in one terminal:

```bash
pnpm --filter api start:dev
```

Start the web app in another:

```bash
pnpm --filter web dev
```

| Service                       | Local address                  |
| ----------------------------- | ------------------------------ |
| Web                           | <http://localhost:3000>        |
| API health and database check | <http://localhost:3001/health> |
| PostgreSQL                    | `localhost:5432`               |
| Mailpit inbox                 | <http://localhost:8025>        |
| Mailpit SMTP                  | `127.0.0.1:1025`               |

Register through the web app, open Mailpit to obtain the verification code, and
confirm the account. Mailpit captures development mail locally; it does not send
messages to the real email address. Successful verification creates the web
session automatically.

## Restarting and stopping local services

After restarting the computer, start the Docker engine, run `docker compose up -d`,
and restart the API and web development commands in their terminals.

```bash
docker compose stop
```

Stopping Compose services preserves the PostgreSQL volume. Removing containers
with `docker compose down` also preserves the named volume; adding `--volumes`
deletes the local database. Use the [API database guide](apps/api/README.md#prisma-and-migrations)
when diagnosing migration problems instead of resetting the database by default.

## Checks and tests

```bash
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api test
pnpm --filter web test
pnpm --filter web exec next typegen
pnpm --filter web exec tsc --noEmit --incremental false
```

API and web unit tests use Vitest. Browser tests use Playwright with the real API,
PostgreSQL, and Mailpit. After completing local setup:

```bash
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

Playwright starts a dedicated API on `3101`, a test proxy on `3102`, and a separate
web server on `3100`. The regular development API on `3001` is not reused. See the [web testing guide](apps/web/README.md#testing) for
individual suites, temporary accounts, local rate limits, and reports. The
[API README](apps/api/README.md#tests-and-checks) explains the separate API smoke test.

## Application boundaries

```text
Browser -> Next.js Server Actions / Route Handlers -> NestJS -> PostgreSQL
                                                       |
                                                       +-> SMTP / Mailpit
```

Next.js stores the access token in an `HttpOnly` cookie and calls Nest from the
server. Nest validates JWTs, enforces business rules, and accesses PostgreSQL
through repositories backed by Prisma. The internal request secret authenticates
forwarded client-IP information; the user's JWT remains responsible for user
authentication.

## Development conventions

- Use English for source code, comments, documentation, and email templates.
- Keep Spanish website translations in `apps/web/src/messages/es.json` and English
  translations in `en.json`; keep message keys alphabetically ordered at every level.
- Name business rules, limits, durations, states, and shared communication contracts.
  Keep constants with their owner and share them when consumers follow the same rule.
- Keep server-only credentials and APIs out of client components and browser bundles.
- Follow [AGENTS.md](AGENTS.md) for the repository's coding conventions.

## Deployment direction

The intended hosting is Vercel for Next.js, Render for NestJS, and a managed
PostgreSQL database on Render. Each application needs its own environment
variables even though both live in this repository. Local Docker Compose is a
development setup, not an automatic production deployment.

Before a public release, configure HTTPS, production email delivery, database
backups, logging, and the deployment migration step. Application-specific details
and current limitations belong in the corresponding README.
