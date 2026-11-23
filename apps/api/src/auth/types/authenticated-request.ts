import type { Request } from 'express';

export type AuthenticatedSession = {
    userId: string;
    authVersion: number;
    sessionId: string;
    absoluteExpiresAt: Date;
};

export type AuthenticatedRequest = Request & {
    auth: AuthenticatedSession;
};
