import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { type AuthSession, Prisma, type User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { SESSION_CONFIG } from '../constants/session.js';
import { AuthSessionRepository } from '../repositories/index.js';
import { createOpaqueToken, hashOpaqueToken } from '../utils/opaque-token.js';

type SessionForCredentials = Pick<
    AuthSession,
    'id' | 'userId' | 'authVersion' | 'idleExpiresAt' | 'absoluteExpiresAt'
>;

@Injectable()
export class AuthSessionService {
    constructor(
        private readonly authSessionRepository: AuthSessionRepository,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async create(
        { id: userId, authVersion }: Pick<User, 'id' | 'authVersion'>,
        transaction?: Prisma.TransactionClient,
    ) {
        const { idleTimeoutSeconds, absoluteTimeoutSeconds } = SESSION_CONFIG;
        const createdAt = new Date();
        const createdAtMs = createdAt.getTime();
        const absoluteExpiresAtMs = createdAtMs + absoluteTimeoutSeconds * MILLISECONDS_PER_SECOND;
        const idleExpiresAtMs = createdAtMs + idleTimeoutSeconds * MILLISECONDS_PER_SECOND;
        const absoluteExpiresAt = new Date(absoluteExpiresAtMs);
        const idleExpiresAt = new Date(Math.min(idleExpiresAtMs, absoluteExpiresAtMs));
        const { token: refreshToken, tokenHash: refreshTokenHash } = createOpaqueToken();

        const { id: sessionId } = await this.authSessionRepository.create(
            {
                userId,
                authVersion,
                createdAt,
                idleExpiresAt,
                absoluteExpiresAt,
                refreshTokenHash,
            },
            transaction,
        );
        return this.issueCredentials(
            { id: sessionId, userId, authVersion, idleExpiresAt, absoluteExpiresAt },
            refreshToken,
        );
    }

    async isActive(sessionId: string, userId: string, authVersion: number): Promise<boolean> {
        const session = await this.authSessionRepository.findActiveById(
            sessionId,
            userId,
            authVersion,
            new Date(),
        );

        return session !== null;
    }

    revokeByRefreshToken(refreshToken: string): Promise<void> {
        const tokenHash = hashOpaqueToken(refreshToken);

        return this.authSessionRepository.revokeByRefreshTokenHash(tokenHash, new Date());
    }

    async rotateRefreshToken(refreshToken: string) {
        const attemptedAtMs = Date.now();
        const tokenHash = hashOpaqueToken(refreshToken);
        const { token: nextRefreshToken, tokenHash: nextTokenHash } = createOpaqueToken();

        const credentials = await this.prisma.$transaction(async (transaction) => {
            const { id: currentTokenId, consumedAt, session } =
                await this.getRefreshContext(tokenHash, transaction);

            if (consumedAt === null) {
                const rotated = await this.authSessionRepository.rotateRefreshToken(
                    {
                        currentTokenId,
                        sessionId: session.id,
                        authVersion: session.authVersion,
                        nextTokenHash,
                        now: new Date(),
                    },
                    transaction,
                );

                if (rotated) {
                    return this.issueCredentials(session, nextRefreshToken);
                }

                const latest = await this.getRefreshContext(tokenHash, transaction);

                if (latest.consumedAt === null) {
                    throw this.invalidRefreshTokenError();
                }

                throw this.refreshTokenAlreadyRotatedError();
            }

            const graceExpiresAtMs = consumedAt.getTime()
                + SESSION_CONFIG.refreshReuseGraceSeconds * MILLISECONDS_PER_SECOND;

            if (attemptedAtMs < graceExpiresAtMs) {
                throw this.refreshTokenAlreadyRotatedError();
            }

            await this.authSessionRepository.revokeById(session.id, new Date(), transaction);

            // Commit the revocation before reporting the authentication error.
            return null;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

        if (credentials === null) {
            throw this.invalidRefreshTokenError();
        }

        return credentials;
    }

    private async issueCredentials(
        { id: sessionId, userId, authVersion, idleExpiresAt, absoluteExpiresAt }: SessionForCredentials,
        refreshToken: string,
    ) {
        const accessToken = await this.jwtService.signAsync({
            sub: userId,
            sid: sessionId,
            authVersion,
        });

        return { accessToken, refreshToken, idleExpiresAt, absoluteExpiresAt };
    }

    private async getRefreshContext(tokenHash: string, transaction: Prisma.TransactionClient) {
        const record = await this.authSessionRepository.findRefreshTokenByHash(tokenHash, transaction);
        const nowMs = Date.now();

        if (
            !record
            || record.session.revokedAt !== null
            || record.session.idleExpiresAt.getTime() <= nowMs
            || record.session.absoluteExpiresAt.getTime() <= nowMs
            || record.session.user.emailVerifiedAt === null
            || record.session.authVersion !== record.session.user.authVersion
        ) {
            throw this.invalidRefreshTokenError();
        }

        return record;
    }

    private invalidRefreshTokenError() {
        const { message, errorCode } = AUTH_ERRORS.invalidToken;

        return new UnauthorizedException(message, { errorCode });
    }

    private refreshTokenAlreadyRotatedError() {
        const { message, errorCode } = AUTH_ERRORS.refreshTokenAlreadyRotated;

        return new ConflictException(message, { errorCode });
    }
}
