import { type APIRequestContext, expect } from '@playwright/test';
import { z } from 'zod';

const MAILPIT_URL = new URL(
  process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025',
);
const SEARCH_PAGE_SIZE = 100;
const VERIFICATION_EMAIL_TIMEOUT_MS = 10_000;
const VERIFICATION_CODE = /Your verification code is:\s*(\d{6})\b/u;
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

async function findMessages(request: APIRequestContext, email: string) {
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
export async function waitForVerificationEmail(
  request: APIRequestContext,
  email: string,
  { excludeMessageIds = [] }: { excludeMessageIds?: string[] } = {},
): Promise<{ id: string; code: string }> {
  let verification: { id: string; code: string } | undefined;

  await expect.poll(async () => {
    const messages = await findMessages(request, email);
    for (const { ID } of messages) {
      if (excludeMessageIds.includes(ID)) continue;
      const response = await request.get(
        new URL(`/api/v1/message/${encodeURIComponent(ID)}`, MAILPIT_URL).href,
      );
      expect(response.ok(), 'Mailpit verification email must be readable').toBe(true);
      const message = messageSchema.parse(await response.json());
      if (!message.To.some(({ Address }) => Address === email)) continue;
      const code = message.Text.match(VERIFICATION_CODE)?.[1];
      if (code) {
        verification = { id: message.ID, code };
        return true;
      }
    }
    return false;
  }, {
    message: 'A verification email must arrive for the temporary E2E recipient',
    timeout: VERIFICATION_EMAIL_TIMEOUT_MS,
  }).toBe(true);

  if (!verification) throw new Error('Verification email did not contain a code.');
  return verification;
}

export async function deleteVerificationEmails(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const messages = await findMessages(request, email);
  const IDs = messages.map(({ ID }) => ID);
  // Mailpit deletes the entire mailbox when IDs are absent or empty.
  if (IDs.length === 0) return;
  const response = await request.delete(
    new URL('/api/v1/messages', MAILPIT_URL).href,
    { data: { IDs } },
  );
  expect(response.ok(), 'Temporary E2E emails must be removed').toBe(true);
}
