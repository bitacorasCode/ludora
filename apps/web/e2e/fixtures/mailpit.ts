import { type APIRequestContext, expect } from '@playwright/test';
import { z } from 'zod';

const MAILPIT_URL = new URL(
  process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025',
);
const SEARCH_PAGE_SIZE = 100;
const EMAIL_DELIVERY_TIMEOUT_MS = 10_000;
const VERIFICATION_CODE = /Your verification code is:\s*(\d{6})\b/u;
const RESET_LINK = /^https?:\/\/\S+$/mu;
const PASSWORD_RESET_SUBJECT = 'Reset your Ludora password';
export const PASSWORD_CHANGED_SUBJECT = 'Your Ludora password has been changed';
const temporaryEmail = /^e2e-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}@example\.test$/;

if (
  MAILPIT_URL.protocol !== 'http:'
  || !['localhost', '127.0.0.1', '[::1]'].includes(MAILPIT_URL.hostname)
  || MAILPIT_URL.username
  || MAILPIT_URL.password
  || MAILPIT_URL.pathname !== '/'
  || MAILPIT_URL.search
  || MAILPIT_URL.hash
) {
  throw new Error('E2E Mailpit must use a local HTTP origin without credentials.');
}

const messageSummarySchema = z.object({
  ID: z.string().min(1),
  Subject: z.string(),
  To: z.array(z.object({ Address: z.string() })),
});
const searchSchema = z.object({
  messages: z.array(messageSummarySchema),
  messages_count: z.number().int().nonnegative(),
});
const messageSchema = messageSummarySchema.extend({ Text: z.string() });

function assertTemporaryEmail(email: string) {
  if (!temporaryEmail.test(email)) {
    throw new Error('Mailpit fixtures only support temporary E2E recipients.');
  }
}

export async function findAccountEmails(request: APIRequestContext, email: string) {
  assertTemporaryEmail(email);
  const messages: z.infer<typeof messageSummarySchema>[] = [];
  let start = 0;

  do {
    const query = new URLSearchParams({
      query: `to:${email}`,
      start: String(start),
      limit: String(SEARCH_PAGE_SIZE),
    });
    const response = await request.get(
      new URL(`/api/v1/search?${query}`, MAILPIT_URL).href,
    );
    expect(response.ok(), 'Mailpit recipient search must succeed').toBe(true);
    const result = searchSchema.parse(await response.json());
    messages.push(
      ...result.messages.filter(({ To }) =>
        To.some(({ Address }) => Address === email),
      ),
    );
    start += result.messages.length;
    if (result.messages.length === 0 || start >= result.messages_count) break;
  } while (true);

  return messages;
}

// Contract: Mailpit v1.31.6 server/ui/api/v1/swagger.json.
async function waitForEmail<T>(
  request: APIRequestContext,
  email: string,
  match: (message: z.infer<typeof messageSchema>) => T | undefined,
  { excludeMessageIds = [] }: { excludeMessageIds?: string[] } = {},
): Promise<{ id: string; value: T }> {
  let captured: { id: string; value: T } | undefined;

  await expect.poll(async () => {
    const messages = await findAccountEmails(request, email);
    for (const { ID } of messages) {
      if (excludeMessageIds.includes(ID)) continue;
      const response = await request.get(
        new URL(`/api/v1/message/${encodeURIComponent(ID)}`, MAILPIT_URL).href,
      );
      expect(response.ok(), 'Mailpit email must be readable').toBe(true);
      const message = messageSchema.parse(await response.json());
      if (!message.To.some(({ Address }) => Address === email)) continue;
      const value = match(message);
      if (value !== undefined) {
        captured = { id: message.ID, value };
        return true;
      }
    }
    return false;
  }, {
    message: 'The expected email must arrive for the temporary E2E recipient',
    timeout: EMAIL_DELIVERY_TIMEOUT_MS,
  }).toBe(true);

  if (!captured) throw new Error('The expected email was not captured.');
  return captured;
}

export async function waitForVerificationEmail(
  request: APIRequestContext,
  email: string,
  options: { excludeMessageIds?: string[] } = {},
): Promise<{ id: string; code: string }> {
  const { id, value: code } = await waitForEmail(
    request,
    email,
    ({ Text }) => Text.match(VERIFICATION_CODE)?.[1],
    options,
  );

  return { id, code };
}

export async function waitForPasswordResetEmail(
  request: APIRequestContext,
  email: string,
): Promise<{ id: string; url: URL }> {
  const { id, value: url } = await waitForEmail(request, email, ({ Subject, Text }) => {
    if (Subject !== PASSWORD_RESET_SUBJECT) return undefined;
    const link = Text.match(RESET_LINK)?.[0];
    if (!link) return undefined;
    const url = new URL(link);

    if (
      url.protocol !== 'http:'
      || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.endsWith('/reset-password')
      || url.username
      || url.password
      || url.searchParams.getAll('token').length !== 1
    ) {
      throw new Error('Recovery emails must contain a local reset URL with one token.');
    }

    return url;
  });

  return { id, url };
}

export async function waitForPasswordChangedEmail(
  request: APIRequestContext,
  email: string,
): Promise<{ id: string; text: string }> {
  const { id, value: text } = await waitForEmail(request, email, ({ Subject, Text }) =>
    Subject === PASSWORD_CHANGED_SUBJECT ? Text : undefined,
  );

  return { id, text };
}

export async function deleteVerificationEmails(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const messages = await findAccountEmails(request, email);
  const IDs = messages.map(({ ID }) => ID);
  // Mailpit deletes the entire mailbox when IDs are absent or empty.
  if (IDs.length === 0) return;
  const response = await request.delete(
    new URL('/api/v1/messages', MAILPIT_URL).href,
    { data: { IDs } },
  );
  expect(response.ok(), 'Temporary E2E emails must be removed').toBe(true);
}
