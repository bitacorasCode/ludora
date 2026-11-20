import type { SessionCredentials } from '@/lib/auth/schemas';

export const sessionCredentials = {
  accessToken: 'test-access-token',
  refreshToken: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  idleExpiresAt: '2030-01-08T12:00:00.000Z',
  absoluteExpiresAt: '2030-01-31T12:00:00.000Z',
} satisfies SessionCredentials;
