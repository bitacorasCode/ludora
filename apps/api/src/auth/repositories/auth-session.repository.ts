import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_COUNT } from '../../common/constants/database.js';
import type { AuthSession, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type CreateAuthSessionData = Pick<
    AuthSession,
    'userId' | 'authVersion' | 'createdAt' | 'idleExpiresAt' | 'absoluteExpiresAt'
> & {
    refreshTokenHash: string;
};

type RotateRefreshTokenData = {
    currentTokenId: string;
    sessionId: string;
    authVersion: number;
    nextTokenHash: string;
    now: Date;
};

type RecordSessionActivityData = {
    sessionId: string;
    userId: string;
    authVersion: number;
    now: Date;
    activityBefore: Date;
    idleExpiresAt: Date;
};

function activeSessionWhere(authVersion: number, now: Date) {
    return {
        authVersion,
        revokedAt: null,
        idleExpiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
        user: {
            authVersion,
            emailVerifiedAt: { not: null },
        },
    } satisfies Prisma.AuthSessionWhereInput;
}

@Injectable()
export class AuthSessionRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(
        { userId, authVersion, createdAt, idleExpiresAt, absoluteExpiresAt, refreshTokenHash }: CreateAuthSessionData,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.authSession.create({
            data: {
                user: { connect: { id: userId } },
                authVersion,
                createdAt,
                lastActiveAt: createdAt,
                idleExpiresAt,
                absoluteExpiresAt,
                refreshTokens: {
                    create: {
                        tokenHash: refreshTokenHash,
                        createdAt,
                    },
                },
            },
            select: { id: true },
        });
    }

    findActiveById(sessionId: string, userId: string, authVersion: number, now: Date) {
        return this.prisma.authSession.findUnique({
            where: { id: sessionId, userId, ...activeSessionWhere(authVersion, now) },
            select: { absoluteExpiresAt: true },
        });
    }

    async recordActivity({
        sessionId,
        userId,
        authVersion,
        now,
        activityBefore,
        idleExpiresAt,
    }: RecordSessionActivityData): Promise<void> {
        await this.prisma.authSession.updateMany({
            where: {
                id: sessionId,
                userId,
                lastActiveAt: { lte: activityBefore },
                ...activeSessionWhere(authVersion, now),
            },
            data: { lastActiveAt: now, idleExpiresAt },
        });
    }

    findRefreshTokenByHash(
        tokenHash: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.refreshToken.findUnique({
            where: { tokenHash },
            select: {
                id: true,
                consumedAt: true,
                session: {
                    select: {
                        id: true,
                        userId: true,
                        authVersion: true,
                        idleExpiresAt: true,
                        absoluteExpiresAt: true,
                        revokedAt: true,
                        user: {
                            select: {
                                authVersion: true,
                                emailVerifiedAt: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async rotateRefreshToken(
        { currentTokenId, sessionId, authVersion, nextTokenHash, now }: RotateRefreshTokenData,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.refreshToken.updateMany({
            where: {
                id: currentTokenId,
                sessionId,
                consumedAt: null,
                session: activeSessionWhere(authVersion, now),
            },
            data: { consumedAt: now },
        });

        if (count !== SINGLE_RECORD_COUNT) {
            return false;
        }

        await transaction.refreshToken.create({
            data: { sessionId, tokenHash: nextTokenHash, createdAt: now },
            select: { id: true },
        });

        return true;
    }

    revokeById(
        sessionId: string,
        revokedAt: Date,
        transaction: Prisma.TransactionClient,
    ): Promise<void> {
        return this.revoke({ id: sessionId }, revokedAt, transaction);
    }

    revokeByRefreshTokenHash(tokenHash: string, revokedAt: Date): Promise<void> {
        return this.revoke(
            { refreshTokens: { some: { tokenHash } } },
            revokedAt,
            this.prisma,
        );
    }

    private async revoke(
        session: Prisma.AuthSessionWhereInput,
        revokedAt: Date,
        transaction: Prisma.TransactionClient,
    ): Promise<void> {
        await transaction.authSession.updateMany({
            where: { ...session, revokedAt: null },
            data: { revokedAt },
        });
    }
}
