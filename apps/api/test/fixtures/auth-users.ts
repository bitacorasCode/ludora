import type { Prisma, User } from '../../src/generated/prisma/client.js';

export const credentials = { email: 'player@example.com', password: 'Password123!' };
export const user: User = {
    id: 'a0db3414-7659-46ee-8435-1a32f52b1f26',
    nickname: 'player',
    email: credentials.email,
    passwordHash: 'stored-password-hash',
    authVersion: 0,
    emailVerifiedAt: null,
    createdAt: new Date('2026-10-20T12:00:00.000Z'),
    updatedAt: new Date('2026-10-20T12:00:00.000Z'),
};
export const publicUser = {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    createdAt: user.createdAt,
};
export const authenticationUser = {
    ...publicUser,
    authVersion: user.authVersion,
    emailVerifiedAt: user.createdAt,
};
export const verification = {
    id: '25f2ce15-8c54-46b2-96f8-cdd77889ac6f',
    expiresAt: new Date('2026-10-20T12:10:00.000Z'),
    resendAvailableAt: new Date('2026-10-20T12:01:00.000Z'),
};
export const sessionCredentials = {
    accessToken: 'signed-access-token',
    refreshToken: 'opaque-refresh-token',
    idleExpiresAt: new Date('2026-10-27T12:00:00.000Z'),
    absoluteExpiresAt: new Date('2026-11-19T12:00:00.000Z'),
};
export const transaction = {} as Prisma.TransactionClient;
