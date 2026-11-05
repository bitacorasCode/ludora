This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Browser tests with Playwright

Authentication tests use the real Nest API, PostgreSQL, and Mailpit.
Run these commands from the monorepo root after installing dependencies and
applying the existing migrations to your local development database.

1. Open Docker Desktop and start PostgreSQL and Mailpit:

   ```bash
   docker compose up -d
   ```

2. Check that the API's SMTP configuration points to Mailpit:
   `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, and `SMTP_SECURE=false`.

3. Install Chromium if it is not already available:

   ```bash
   pnpm --filter web exec playwright install chromium
   ```

4. Run the registration and verification flows:

   ```bash
   pnpm --filter web test:e2e e2e/email-verification.spec.ts --project=guest
   ```

   To run password recovery, notification, and session revocation scenarios:

   ```bash
   pnpm --filter web test:e2e e2e/password-recovery.spec.ts --project=guest
   ```

   To run the entire browser test suite:

   ```bash
   pnpm --filter web test:e2e
   ```

Playwright starts the API if it is unavailable and launches a separate web app
on port `3100`, with the test proxy on `3102`. The API uses `3001`, and Mailpit
exposes its inbox and API on `8025`. The test web app uses `.next-e2e` to keep
its build separate from the regular development server.

Accounts use unique email addresses in the form `e2e-<uuid>@example.test`.
Cleanup removes only those accounts and their messages. It does not clear the
database or the Mailpit inbox. Cleanup requires a local PostgreSQL database
and a valid temporary recipient.

The resend flow waits for the server's actual cooldown, which takes about one
minute. It does not change the clock, database timestamps, or application limits.
The tests read the code from the email captured by Mailpit and check that the
`HttpOnly` cookie appears only after confirmation.

Authentication tests disable traces and screenshots because they may contain
credentials, verification codes, or tokens.

## Password recovery

The recovery request form calls a Server Action that validates its input and
sends the email address to `POST /auth/forgot-password` through the server API
client. The action validates the `{ "accepted": true }` response and returns no
account information or recovery token to the browser.

The form shows a generic confirmation after acceptance. The shared error toast
handles API failures and the waiting period returned by the server for `429` responses.
The request sends a real recovery email when the account exists and its waiting
period allows it.

The reset page reads the token from the email link without consuming it. Its
route loading UI wraps the request-time query access. Missing, malformed, or
repeated token parameters show a recovery-link error with an action to request
a new link. The API checks expiration and previous use when the form is submitted.
The page disables indexing and uses `no-referrer` metadata to keep the token out
of navigation referrers.

The reset Server Action validates the token, new password, and confirmation, then
sends only `token` and `password` to `POST /auth/reset-password`. The API consumes
the token, updates the password, and invalidates previous JWTs. Only after
validating `{ "reset": true }` does the action delete the browser's session cookie.
The form clears its password fields, shows a confirmation toast, and replaces
the current URL with the localized login route. It does not create a session.
After commit, the API schedules a separate email notifying the user of the
password change. Sending this notice does not delay or alter the reset response.
Expired or consumed links show the same recovery-link error; other failures use
the shared error toast, including the waiting period for `429` responses.

This flow does not write recovery tokens to local storage, application logs,
toast messages, or secondary links. The token and form values are revalidated in
the Server Action even after the browser has validated them.
