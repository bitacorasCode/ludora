# Data access architecture

## Imports and indexes

- Use `index.ts` as a folder entry point when it groups related exports and
  simplifies its consumers, as with the authentication DTOs.
- Declare exports explicitly and use `export type` or `import type` for symbols
  that only represent types.
- Within a folder, import dependencies directly from neighboring files. Avoid
  importing an index that also exports the consumer.
- Keep the explicit filename and `.js` extension in relative imports for NodeNext.
- Review transitive dependencies when extending an index: re-exporting a module
  can also load its dependencies and introduce a cycle.

## Cryptographic configuration

Shared algorithm and encoding names are declared in `common/constants/crypto.ts`.
Each flow selects those values while keeping its own lengths, expiration periods,
and rules. Internal authentication converts the secret to UTF-8 bytes to compare
its exact text representation.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| Controller and DTO | Receive HTTP requests, validate input, and delegate the use case. |
| Service | Apply rules, normalize data, and coordinate operations. |
| Repository | Run Prisma queries within the module that owns the data. |
| PrismaService | Create the client and its pool, and initialize and close their resources. |

`UsersRepository` centralizes user queries.
`EmailVerificationRepository` centralizes email verification queries.
`PasswordResetRepository` centralizes password recovery queries.
Repositories are internal providers of their modules; other modules use their
public services.

For example, `UsersService.create()` normalizes the nickname and email, then
delegates persistence to `UsersRepository.create()`.

## Transactions

The service coordinating a use case opens its transaction with
`PrismaService.$transaction()`. All participating services and repositories receive
the same `Prisma.TransactionClient` through the `transaction` argument.

- `AuthService` coordinates creation of the user and their verification.
- `EmailVerificationService` coordinates code consumption and account activation.
- Account activation goes through `UsersService` and `UsersRepository`.
- Reserving an attempt and consuming a code require an explicit transaction.
- Resending reserves `lastSentAt` with a conditional update and renews the code
  within the same transaction. That lock also coordinates concurrent resends
  and email confirmation.
- `lastSentAt` represents the delivery reservation, even if SMTP does not confirm
  delivery. Each resend generates a random code, renews its expiration, and resets
  its attempts without changing the verification identifier.
- During confirmation, validation errors are thrown after the transaction
  finishes so failed attempts remain recorded.
- SMTP delivery happens after the registration transaction commits.
- Resends also contact SMTP after their transaction commits.

Services own process decisions. Repositories receive prepared data, timestamps,
and limits to build the corresponding queries.

## Reads and responses

User creation and public reads select `id`, `nickname`, `email`, and `createdAt`.
The email lookup used for authentication includes the password hash. That complete
row belongs to the internal authentication flow and is never returned directly
in an HTTP response.

Login checks the password before returning the next step:

- `authenticated` includes the JWT and the public fields of the verified user.
- `verifyEmail` includes only the verification identifier, its expiration, and
  the next available resend time. It does not create a session.

`EmailVerificationService.getPending()` queries the repository using the unique
user identifier and requires the email to remain unverified. Resuming this flow
is a read: it does not renew the code, send email, or change attempts or waiting
periods. The read includes expired verifications so the existing resend flow
remains available.
If no pending verification is found, login keeps the unverified-email error
and does not issue a JWT. A concurrent confirmation can make this read stale;
the client can repeat login without bypassing verification.

## Authentication version

`User.authVersion` is an internal counter stored in `users.auth_version` with an
initial value of zero. JWTs include this version alongside the user identifier.
`JwtAuthGuard` verifies the signature and payload, then uses
`UsersService.findAuthenticationById()` to require an existing user, a verified
email, and a version matching the database. This read is performed for each
protected request and must not use a cache shared across requests.

`UsersRepository.updatePassword()` requires a transaction and changes the
password hash and increments `authVersion` in one update. Once that transaction
commits, JWTs carrying an earlier version are rejected on subsequent requests.
Requests already authorized before the commit may still finish.

Login signs the version read together with the password hash it verified. It
must not reload a newer version after checking an older password. Email
confirmation reads the internal authentication fields after confirmation.
The public user selection remains unchanged and excludes the counter.

JWTs issued before this claim was introduced are rejected. Users with those
tokens must sign in again after deployment.

## Password recovery model

`PasswordResetTokenService.create()` generates a temporary credential containing
its token, hash, and expiration. The initial configuration uses 32 random bytes
encoded as `base64url`, a hexadecimal SHA-256 hash, and a 30-minute lifetime.
`hash(token)` applies the same transformation when looking up a recovery link.
The original token must be used exclusively in the email link. It must not be
persisted, logged, or returned in the public recovery-request response.

`PasswordReset` defines at most one request per user. `tokenHash` allows lookup
without storing the token sent in the email link. Renewal must replace the hash
and expiration, invalidating the previous link. As in email verification,
`lastSentAt` represents the delivery reservation; it does not guarantee that SMTP
delivered the message.

Consumption must conditionally delete the request by hash and expiration within
the same transaction that changes the password. It may proceed only if one row
was deleted. This prevents reuse and concurrent consumption of the same link.

`PasswordResetRepository.reserveRequest()` attempts insertion while skipping
duplicates. If a request already exists, it renews it only when `lastSentAt`
satisfies the supplied time limit. Both reservation and consumption require the
service to pass a transaction. Lookup by hash returns only the associated user
and expiration.

The service must calculate `lastSentAt` and the reservation cutoff from the same
instant. To consume a token, it must capture the current time inside the
transaction, after hashing the new password.

## Requesting a recovery link

`POST /auth/forgot-password` is a public endpoint that accepts a JSON body with
only `email`. `forgotPasswordSchema` reuses the shared email schema to trim,
lowercase, and validate the address. The global `StandardSchemaValidationPipe`
rejects missing or invalid emails and unexpected fields with `400 Bad Request`.

Requests that pass validation and rate limiting receive `202 Accepted` with
`{ "accepted": true }`. This acknowledges the request, not account existence or
email delivery. The response stays the same for unknown accounts, accounts
within their waiting period, and SMTP failures. It never includes a token or link.

The controller delegates directly to `PasswordRecoveryService`. Its
`AUTH_RATE_LIMIT_CONFIG.forgotPassword` policy allows five requests per client IP
within 15 minutes, followed by a 15-minute block when exceeded. The existing
`RateLimitGuard` returns `429 Too Many Requests`, `RATE_LIMIT_EXCEEDED`, and
`retryAfterSeconds`. This is separate from the reservation waiting period per
account.

`PasswordRecoveryService.request(email)` schedules processing and returns without
waiting for account lookup, reservation, or SMTP. It does not return user data
or email-delivery status. Processing those operations after scheduling keeps
their results out of the HTTP response.

Processing looks up the user through `UsersService`, generates the credential,
and reserves the request in a transaction. The initial waiting period per account
is 60 seconds. Email is sent after commit. An SMTP failure keeps the reservation
and produces only a generic log, without email addresses, links, or tokens.
Requesting recovery does not change the password or verify the email.

`PASSWORD_RESET_URL` is a complete URL from trusted configuration. Locally, it
points to `http://localhost:3000/reset-password`, leaving language selection to
the Next proxy. Both apps share `parseHttpUrl()` validation; recovery additionally
rejects an initial query or fragment. The token is added with `URLSearchParams`.
Production requires HTTPS. HTTP is allowed only for loopback hosts during
development and tests.

Current processing runs in API memory. A restart or deployment can lose pending
requests. A persistent queue will be needed for durable work and retries.

## Resetting a password

`POST /auth/reset-password` accepts only `token` and `password` in its JSON body.
The DTO requires a nonempty base64url token and reuses the password minimum from
`AUTH_VALIDATION`. Password confirmation belongs to the web form and is not
part of this endpoint's body.

`PasswordRecoveryService.reset()` hashes the token and checks its stored
expiration before hashing the new password with `PasswordService`. Argon2 runs
outside the database transaction to keep locks short.

The service then opens one transaction. The repository conditionally consumes
the token using its hash and a fresh timestamp, and the user repository updates
the password hash and authentication version within that same transaction. If
consumption fails or the password update throws, the transaction rolls back.
Two concurrent submissions of the same link cannot both consume it.

The endpoint returns `200 OK` with `{ "reset": true }` only after commit. Unrecognized,
expired, renewed, or consumed links receive `400 Bad Request` with the shared
`AUTH_PASSWORD_RESET_INVALID` code. Invalid body shapes are rejected by the
global validation pipe. The endpoint's rate limit is five requests per client IP
within 15 minutes, with a 15-minute block when exceeded.

Resetting the password does not mark the email as verified and does not issue a
JWT. The user must sign in through the usual login flow afterward.

### Password change notification

`UsersRepository.updatePassword()` returns the identifier and email of the
updated user. The reset transaction returns that result so the service can use
the recipient captured by the update, without another database query. These
fields remain internal; the endpoint still returns only `{ "reset": true }`.

Only after the transaction commits does the service schedule a notification
using `setImmediate` and the existing `MailService`. The English template tells
the user that the password changed, that previous sessions are invalid, and
what to do if they did not make the change. It includes no password, hash, token,
or recovery link.

SMTP is not awaited by the HTTP request. A delivery failure produces a generic
log without recipient details or credentials. It does not undo the change or
turn a committed reset into an HTTP error. As with recovery requests, this task
runs in memory; a process restart can lose it. Durable delivery and retries
require a persistent queue.
