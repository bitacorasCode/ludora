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

## Password recovery model

`PasswordResetTokenService.create()` generates a temporary credential containing
its token, hash, and expiration. The initial configuration uses 32 random bytes
encoded as `base64url`, a hexadecimal SHA-256 hash, and a 30-minute lifetime.
`hash(token)` applies the same transformation for the future request lookup.
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

`PasswordRecoveryService.request(email)` schedules processing and returns without
waiting for account lookup, reservation, or SMTP. It does not return user data
or email-delivery status. This lets the future endpoint use the same response
for an existing account, an unknown account, or an account within its waiting
period between requests.

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
