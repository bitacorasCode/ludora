import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { publicUser, sessionCredentials, transaction, user } from '../../../test/fixtures/auth-users.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthSessionRepository } from '../repositories/auth-session.repository.js';
import { AuthSessionService } from './auth-session.service.js';

describe('AuthSessionService', () => {
    it('issues credentials bound to the created session with only public user fields', async () => {
        const sessionId = 'ecec41fa-b532-4cd3-9487-08dfadcd22ec';
        const sessions = { create: vi.fn<AuthSessionRepository['create']>().mockResolvedValue({ id: sessionId }) };
        const jwt = { signAsync: vi.fn().mockResolvedValue(sessionCredentials.accessToken) };
        const module = await Test.createTestingModule({
            providers: [
                AuthSessionService,
                { provide: AuthSessionRepository, useValue: sessions },
                { provide: PrismaService, useValue: {} },
                { provide: JwtService, useValue: jwt },
            ],
        }).compile();

        const service = module.get(AuthSessionService);
        await expect(service.create(user, transaction)).resolves.toEqual({
            accessToken: sessionCredentials.accessToken,
            refreshToken: expect.any(String),
            idleExpiresAt: expect.any(Date),
            absoluteExpiresAt: expect.any(Date),
            user: publicUser,
        });
        expect(sessions.create).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ userId: user.id, authVersion: user.authVersion }),
            transaction,
        );
        expect(jwt.signAsync).toHaveBeenCalledExactlyOnceWith({
            sub: user.id,
            sid: sessionId,
            authVersion: user.authVersion,
        });
    });
});
