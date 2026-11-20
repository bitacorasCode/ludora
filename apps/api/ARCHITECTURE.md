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
- Shared guards, request services, and constant catalogs have category indexes.
  Module classes keep explicit file imports rather than sharing an index with
  their own providers.

## Nest module boundaries

- `providers` registers the dependencies that Nest creates within a module.
- `imports` grants access to providers exported by other Nest modules.
- `exports` exposes selected providers or re-exports imported Nest modules.
- JavaScript imports and index exports make symbols available to a source file;
  Nest module metadata controls whether those dependencies can be injected.

For example, `ClientIpModule` registers and exports `InternalRequestService`.
`AuthModule` imports `ClientIpModule`, so its `InternalRequestGuard` can inject
the existing service without registering it again.

## Cryptographic configuration

Shared algorithm and encoding names are declared in `common/constants/crypto.ts`.
The opaque token helper centralizes the size, encoding, and hashing of random
credentials. Each flow controls its own expiration and validation rules.
Internal authentication converts the secret to UTF-8 bytes to compare its exact
text representation.

## Responsibilities

| Layer              | Responsibility                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| Controller and DTO | Receive HTTP requests, validate input, and delegate the use case.         |
| Service            | Apply rules, normalize data, and coordinate operations.                   |
| Repository         | Run Prisma queries within the module that owns the data.                  |
| PrismaService      | Create the client and its pool, and initialize and close their resources. |

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
- `lastSentAt` represents the delivery reservation, even if email submission is
  not confirmed. Each resend generates a random code, renews its expiration,
  and resets its attempts without changing the verification identifier.
- During confirmation, validation errors are thrown after the transaction
  finishes so failed attempts remain recorded.
- Email submission happens after the registration transaction commits.
- Resends also contact the selected mail provider after their transaction commits.
- Refresh token rotation conditionally consumes the previous token and stores its
  replacement in the same transaction as signing the new access token. Requests
  that lose a concurrent rotation or arrive within five seconds of consumption
  receive a conflict. Later reuse revokes the session before the service reports
  an authentication error. Database-backed tests for concurrent consumption,
  rollback, and revocation are deferred until requested.
- Logout revokes the session in one conditional update using the presented refresh
  token's hash. Consumed refresh tokens can still identify their session so a
  concurrent rotation cannot prevent logout. Idempotent logout coverage is
  deferred until requested.
- Session activity conditionally updates `lastActiveAt` and `idleExpiresAt`
  together. The update rechecks session validity and the activity cutoff so
  simultaneous requests from different tabs share the same write limit. Coverage
  of concurrent activity and the absolute deadline cap is deferred until requested.

Services own process decisions. Repositories receive prepared data, timestamps,
and limits to build the corresponding queries.

## Reads and responses

User creation and public reads select `id`, `nickname`, `email`, and `createdAt`.
The email lookup used for authentication includes the password hash. That complete
row belongs to the internal authentication flow and is never returned directly
in an HTTP response.

The dedicated current-user read selects the optional profile's avatar preset and
the password hash for internal capability detection. `GET /auth/me` removes the
hash, flattens the preset to nullable `avatarPresetId`, and exposes only a boolean
`hasPassword` for account settings. This capability follows the stored credential,
not the provider used to sign in. Other public user selections keep their existing
response fields. The email is account data and is not part of the profile response.

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

## OAuth account resolution

`POST /auth/google/callback` accepts the signed authorization context and the
original callback query parameters through a strict DTO. It requires a trusted
internal request and the login rate limit. `GoogleAuthService` validates the
provider response before `AuthService` resolves the Ludora account.

Identity lookup uses `(provider, providerUserId)`. A linked identity loads its
existing user and shares the usual login response: verified users receive a JWT,
while unverified users can resume their existing email verification. Provider
email changes do not change the account email or its verification status.

An unlinked identity whose email is already registered returns
`AUTH_OAUTH_ACCOUNT_LINK_REQUIRED`. Matching emails never link accounts
automatically. The collision lookup selects only the existing user identifier.

Other identities return `completeRegistration` with a signed `registrationToken`,
its expiration, and the provider email and verification flag. This preparation
creates no user or identity and reserves no email or nickname. Missing or
unverified provider email remains explicitly unverified for the registration
completion step.

`OAuthFlowTokenService` shares timestamp and signing logic across the authorization
and registration contexts. They use separate audiences (`ludora-oauth-flow` and
`ludora-oauth-registration`) and independently configured expiration periods.
Registration tokens cannot be used as session or authorization-flow tokens.

### OAuth registration completion

`POST /auth/oauth/register` requires a trusted internal request and the registration
rate limit. Its strict DTO accepts `registrationToken`, `nickname`, and an optional
`email`; nickname validation reuses the password-registration schema. Verification
checks the registration audience, signature, expiration, and identity payload.

The provider email is authoritative for this attempt. A supplied address must
match it. When the provider supplied no email, the caller must provide one and
verify it through Ludora. The client cannot supply an `emailVerified` flag or a
password. Social accounts are created with a null password hash.

`AuthService` rechecks identity and email conflicts inside the transaction, then
creates the user and provider identity together. A verified provider email marks
the new user as verified; other addresses receive a pending email-verification
record in that same transaction. Existing unique constraints protect concurrent
requests. A provider-identity constraint violation returns
`AUTH_OAUTH_IDENTITY_ALREADY_LINKED` and rolls back the competing user creation.
An already-linked identity cannot reuse a registration grant to issue sessions.

After commit, verified accounts receive the usual authenticated response. Other
accounts return `verifyEmail` and delivery metadata. Email is sent after commit;
delivery failure leaves the account available for the existing resend flow.
Local and OAuth registration share public-user projection and email-delivery
response formatting, excluding password hashes and authentication versions.

### Browser callback and registration context

Next stores the signed authorization context, expected state, and locale in an
HttpOnly cookie. Its `/api/auth/google/callback` Route Handler checks the browser
state before consuming that cookie, then sends the original response parameters
to Nest. Nest still validates the signed context, state, nonce, PKCE, and provider
response. A cancelled provider authorization has its own error code.

Authenticated responses become a Next session cookie. Pending registrations use
a separate HttpOnly cookie; tokens never appear in application URLs or client
component props. A missing or mismatched callback state does not consume the
browser's active flow. Callback redirects use fixed local destinations and
`no-store` and `no-referrer` response headers.

`POST /auth/oauth/registration-context` requires the internal guard and login rate
limit. It verifies the registration JWT and returns only its email, verification
flag, and expiration, with no database mutation. Next uses this endpoint to render
the nickname form without decoding or trusting an unverified token. Submission
validates the token again through `POST /auth/oauth/register`; the preview is not
an authorization grant or a reservation.

The web completion form collects a nickname and requests an email only when the
provider supplied none. Successful creation opens the usual session or continues
the existing email-verification flow. Authenticated account linking and Discord
sign-in remain subsequent steps.

Focused service tests cover login by stable provider identity, verified Google
registration without a local password, and rejection of existing-email collisions.
Google verification is mocked in these tests. Real provider integration, grant
expiration/audience checks, and database concurrency remain outside that coverage.

## Authentication version

`User.authVersion` is an internal counter stored in `users.auth_version` with an
initial value of zero. JWTs include this version alongside the user identifier.
New JWTs also carry the session ID in `sid`. After verifying the signature and
payload, `JwtAuthGuard` checks that the session belongs to the subject, has not
expired or been revoked, and matches the current version of a verified user.
This check reads PostgreSQL on each protected request. JWTs issued before session
binding continue to use the user version check until they expire.

`UsersRepository.updatePassword()` requires a transaction and changes the
password hash and increments `authVersion` in one update. Once that transaction
commits, JWTs carrying an earlier version are rejected on subsequent requests.
Requests already authorized before the commit may still finish.

Login signs the version read together with the password hash it verified. It
must not reload a newer version after checking an older password. Email
confirmation reads the internal authentication fields after confirmation.
The public user selection remains unchanged and excludes the counter.

JWTs without `authVersion` are rejected.

Deferred test work includes wiring the session service into the authentication
fixtures and covering session-bound JWT issuance and guard rejection after
revocation.

## Authenticated password changes

`POST /auth/change-password` accepts only `currentPassword` and `password` and
requires `JwtAuthGuard` plus the dedicated rate limit. The guard preserves the
verified `authVersion` in the internal request context. The service loads password
credentials through `UsersService`, verifies the current password, rejects an
unchanged password, and computes the new hash before opening a transaction.

Inside the transaction, pending reset rows are removed first, matching recovery's
reset-row-before-user-row lock order. `UsersRepository.changePasswordIfCurrent()`
then conditionally updates the user using the expected password hash and verified
authentication version. It increments the version atomically. If the update loses
a race or the user is no longer valid, the transaction rolls back and the request
is rejected as stale authentication. Password reset rows remain intact on rollback.

The transaction also creates a replacement session and signs its JWT using the
updated version. After commit, the API schedules the shared password-change
notification. Next validates the response's user identifier before replacing its
HttpOnly cookie. The current browser remains
signed in; previously issued tokens are rejected. An incorrect current password
uses `400`, so the frontend does not mistake it for an expired session. Email
changes are not part of this use case and are not exposed by an endpoint.

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
`lastSentAt` represents the delivery reservation; it does not guarantee that the
mail provider delivered the message.

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
within their waiting period, and mail provider failures. It never includes a
token or link.

The controller delegates directly to `PasswordRecoveryService`. Its
`AUTH_RATE_LIMIT_CONFIG.forgotPassword` policy allows five requests per client IP
within 15 minutes, followed by a 15-minute block when exceeded. The existing
`RateLimitGuard` returns `429 Too Many Requests`, `RATE_LIMIT_EXCEEDED`, and
`retryAfterSeconds`. This is separate from the reservation waiting period per
account.

`PasswordRecoveryService.request(email)` schedules processing and returns without
waiting for account lookup, reservation, or email submission. It does not return
user data or email-delivery status. Processing those operations after scheduling keeps
their results out of the HTTP response.

Processing looks up the user through `UsersService`, generates the credential,
and reserves the request in a transaction. The initial waiting period per account
is 60 seconds. Email is sent after commit. A mail provider failure keeps the
reservation and produces only a generic log, without email addresses, links, or tokens.
Requesting recovery does not change the password or verify the email.

The same flow can establish the first password for an account created through an
external provider. The mail subject and request description distinguish creation
from reset using the stored password state, without accepting a caller-supplied
intent. Token issuance, waiting periods, consumption, authentication-version
updates, and the password-change notification remain shared. Provider identities
are not modified, so external sign-in remains available after adding a password.

Focused tests cover current-user capability projection without hash disclosure,
creation/reset email links, and establishing the first password through recovery.

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

Only after the transaction commits does `PasswordNotificationService` schedule a
notification using `setImmediate` and the existing `MailService`. Password recovery
and authenticated password changes use the same notification service. The token
lookup includes the user's previous password hash internally so recovery can
distinguish first-time creation from replacement. The service passes only that
boolean to the notification after commit; URL presentation modes do not determine
the notification wording. The hash is never included in a response or email.

The English template tells the user that the password was created or changed,
that previous sessions are invalid, and what to do if they did not make the change.
It includes no password, hash, token, or recovery link.

Reset lookup fixtures include the previous credential. Service tests cover creation
versus replacement notification wording and require the update to commit before
notification is scheduled; existing tests also cover mail failures after commit.

Email submission is not awaited by the HTTP request. A delivery failure produces
a generic log without recipient details or credentials. It does not undo the change or
turn a committed reset into an HTTP error. As with recovery requests, this task
runs in memory; a process restart can lose it. Durable delivery and retries
require a persistent queue.

## Mail transport

Authentication services use `MailService.send()` for all outgoing emails.
`MAIL_PROVIDER` explicitly selects `smtp` or `resend`, independently of `NODE_ENV`.
The constructor validates only the selected provider's settings and prepares its
transport. Configuration failures prevent the API from starting.

SMTP uses Nodemailer with local Mailpit. Resend uses the HTTPS send-email endpoint
with a sending key held only by Nest. Successful Resend submission requires a
successful HTTP response and a nonempty submission ID; this confirms acceptance
by the provider, not inbox placement. Network errors, rejected requests, timeouts,
and invalid responses propagate to the calling service's existing error handling.

Provider selection does not change credential storage, transaction boundaries,
or the public authentication responses. SMTP authentication, persistent delivery
jobs, automatic retries, and delivery webhooks are not implemented.
