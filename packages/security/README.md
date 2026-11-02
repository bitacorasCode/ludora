# @ludora/security

Public security and authentication definitions shared by Nest and Next.

| Export | Purpose |
| --- | --- |
| `HEX_64_PATTERN` | Format of secrets containing 64 hexadecimal characters. |
| `DIGITS_PATTERN` | Codes containing only ASCII digits. |
| `INTERNAL_REQUEST_HEADERS` | Header names used between Next and Nest. |
| `AUTH_NEXT_STEP` | Next steps that login can return. |
| `AUTH_ERROR_CODES` | Public authentication error identifiers. |
| `AUTH_VALIDATION` | Minimum nickname and new password lengths. |
| `EMAIL_VERIFICATION_CODE_LENGTH` | Length of the generated and validated code. |
| `ACCESS_TOKEN_TTL_SECONDS` | JWT and session cookie lifetime. |

## Usage

Both apps declare `"@ludora/security": "workspace:*"` in their dependencies.
Install dependencies from the monorepo root:

```sh
pnpm install
```

```ts
import { HEX_64_PATTERN } from '@ludora/security';
```

The package uses executable ESM JavaScript and TypeScript declarations
(`index.d.ts`). The apps can start without building this package first. Public
types are maintained alongside the exports; configuration values are defined
in `index.js`.

## Responsibilities

- Secret values stay in each app's environment variables.
- Nest handles cryptographic comparison, hashing, and JWT issuance.
- Next handles cookies and reads its configuration.
- Each app maintains its Zod schemas, transformations, and messages. The web
  app also validates password confirmation, which is not part of the registration DTO.
- `passwordMinLength` applies to new passwords; login only requires a password
  to be present.
- Code expiration, attempt limits, and the resend cooldown are Nest policies;
  the web app uses the timestamps and waiting periods returned by the server.

A secret's format does not prove its randomness. `INTERNAL_API_SECRET` and
`EMAIL_VERIFICATION_SECRET` must remain independent values.

## Server utilities

`@ludora/security/server` exposes `isValidIp()` and `parseHttpUrl()` for both apps.
This entry point uses Node and must only be imported from server code.

`parseHttpUrl(value, nodeEnvironment)` returns a valid URL or `null`. It requires
HTTPS without credentials; HTTP over loopback is allowed only in development
and tests. The caller must supply the value from trusted configuration and apply
any additional restrictions on its path, query, or fragment.

Vercel and Render deployments must preserve the workspace and install from the
root, including `packages/security` and the lockfile.
