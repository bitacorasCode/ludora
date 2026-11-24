import { AUTH_NEXT_STEP } from '@ludora/contracts/auth';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import {
    authenticationUser,
    publicUser,
    sessionCredentials,
    transaction,
    user,
    verification,
} from '../../../test/fixtures/auth-users.js';
import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { AuthProvider, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { OAUTH_REGISTRATION_TOKEN_CONFIG } from '../constants/oauth-flow.js';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository.js';
import { AuthService } from './auth.service.js';
import { AuthSessionService } from './auth-session.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { OAuthAccountService } from './oauth-account.service.js';
import { OAuthFlowTokenService } from './oauth-flow-token.service.js';
import { PasswordService } from './password.service.js';

describe('OAuthAccountService', () => {
    let service: OAuthAccountService;

    const usersService = {
        create: vi.fn<UsersService['create']>(),
        findIdByEmail: vi.fn<UsersService['findIdByEmail']>(),
        findAuthenticationById: vi.fn<(
            ...args: Parameters<UsersService['findAuthenticationById']>
        ) => Promise<Awaited<ReturnType<UsersService['findAuthenticationById']>>>>(),
    };
    const authSessions = { create: vi.fn<AuthSessionService['create']>() };
    const prisma = {
        $transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>) =>
            operation(transaction)),
    };
    const identities = {
        findByProviderUserId: vi.fn<AuthIdentityRepository['findByProviderUserId']>(),
        create: vi.fn<AuthIdentityRepository['create']>(),
    };
    const oauthTokens = {
        createRegistration: vi.fn<OAuthFlowTokenService['createRegistration']>(),
        verifyRegistration: vi.fn<OAuthFlowTokenService['verifyRegistration']>(),
    };
    const verificationService = {
        create: vi.fn<EmailVerificationService['create']>(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        usersService.create.mockResolvedValue(authenticationUser);
        usersService.findIdByEmail.mockResolvedValue(null);
        usersService.findAuthenticationById.mockResolvedValue(authenticationUser);
        identities.findByProviderUserId.mockResolvedValue(null);
        authSessions.create.mockResolvedValue({ ...sessionCredentials, user: publicUser });

        const module = await Test.createTestingModule({
            providers: [
                OAuthAccountService,
                AuthService,
                { provide: AuthSessionService, useValue: authSessions },
                { provide: PasswordService, useValue: {} },
                { provide: AuthIdentityRepository, useValue: identities },
                { provide: EmailVerificationService, useValue: verificationService },
                { provide: OAuthFlowTokenService, useValue: oauthTokens },
                { provide: PrismaService, useValue: prisma },
                { provide: UsersService, useValue: usersService },
            ],
        }).compile();

        service = module.get(OAuthAccountService);
    });

    describe('resolving external accounts', () => {
        const identity = {
            provider: AuthProvider.GOOGLE,
            providerUserId: 'google-subject',
            email: user.email,
            emailVerified: true,
        };
        const grant = { registrationToken: 'registration-token', expiresAt: verification.expiresAt };

        beforeEach(() => {
            const issuedAtSeconds = user.createdAt.getTime() / MILLISECONDS_PER_SECOND;
            oauthTokens.createRegistration.mockResolvedValue(grant);
            oauthTokens.verifyRegistration.mockResolvedValue({
                ...identity,
                iat: issuedAtSeconds,
                exp: issuedAtSeconds + OAUTH_REGISTRATION_TOKEN_CONFIG.expiresInSeconds,
            });
        });

        it('signs in an existing identity by provider ID even when its provider email changes', async () => {
            identities.findByProviderUserId.mockResolvedValue({ userId: user.id });

            await expect(service.resolveExternalIdentity({ ...identity, email: 'changed@example.com' })).resolves.toEqual({
                nextStep: AUTH_NEXT_STEP.authenticated,
                ...sessionCredentials,
                user: publicUser,
            });
            expect(identities.findByProviderUserId).toHaveBeenCalledExactlyOnceWith(identity.provider, identity.providerUserId);
            expect(usersService.findIdByEmail).not.toHaveBeenCalled();
            expect(oauthTokens.createRegistration).not.toHaveBeenCalled();
        });

        it('prepares and completes a verified Google registration without creating a local password', async () => {
            await expect(service.resolveExternalIdentity(identity)).resolves.toEqual({
                nextStep: AUTH_NEXT_STEP.completeRegistration,
                registration: { ...grant, email: identity.email, emailVerified: true },
            });
            expect(usersService.create).not.toHaveBeenCalled();

            await expect(service.completeOAuthRegistration({ registrationToken: grant.registrationToken, nickname: user.nickname })).resolves.toEqual({
                nextStep: AUTH_NEXT_STEP.authenticated,
                ...sessionCredentials,
                user: publicUser,
            });
            expect(oauthTokens.verifyRegistration).toHaveBeenCalledExactlyOnceWith(grant.registrationToken);
            expect(usersService.create).toHaveBeenCalledExactlyOnceWith({ nickname: user.nickname, email: user.email, passwordHash: null, emailVerifiedAt: expect.any(Date) }, transaction);
            expect(identities.create).toHaveBeenCalledExactlyOnceWith({ userId: user.id, provider: identity.provider, providerUserId: identity.providerUserId }, transaction);
            expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
            expect(verificationService.create).not.toHaveBeenCalled();
        });

        it('rejects an existing email instead of linking an unrecognized identity automatically', async () => {
            usersService.findIdByEmail.mockResolvedValue({ id: user.id });

            await expect(service.resolveExternalIdentity(identity)).rejects.toMatchObject({
                status: 409,
                response: AUTH_ERRORS.oauthAccountLinkRequired,
            });
            expect(identities.create).not.toHaveBeenCalled();
            expect(oauthTokens.createRegistration).not.toHaveBeenCalled();
            expect(authSessions.create).not.toHaveBeenCalled();
        });
    });
});
