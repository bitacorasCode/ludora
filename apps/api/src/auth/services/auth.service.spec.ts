import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { AUTH_NEXT_STEP } from '../constants/auth-next-step.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
    let service: AuthService;

    const credentials = { email: 'player@example.com', password: 'Password123!' };
    const user: User = {
        id: 'a0db3414-7659-46ee-8435-1a32f52b1f26',
        nickname: 'player',
        email: credentials.email,
        passwordHash: 'stored-password-hash',
        emailVerifiedAt: null,
        createdAt: new Date('2026-10-20T12:00:00.000Z'),
        updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    };
    const publicUser = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt,
    };
    const verification = {
        id: '25f2ce15-8c54-46b2-96f8-cdd77889ac6f',
        expiresAt: new Date('2026-10-20T12:10:00.000Z'),
        resendAvailableAt: new Date('2026-10-20T12:01:00.000Z'),
    };
    const usersService = {
        findByEmail: vi.fn<UsersService['findByEmail']>(),
        findById: vi.fn<(
            ...args: Parameters<UsersService['findById']>
        ) => Promise<Awaited<ReturnType<UsersService['findById']>>>>(),
    };
    const passwordService = {
        hash: vi.fn<PasswordService['hash']>(),
        verify: vi.fn<PasswordService['verify']>(),
    };
    const jwtService = { signAsync: vi.fn<JwtService['signAsync']>() };
    const verificationService = {
        getPending: vi.fn<EmailVerificationService['getPending']>(),
        confirm: vi.fn<EmailVerificationService['confirm']>(),
        resend: vi.fn<EmailVerificationService['resend']>(),
        create: vi.fn<EmailVerificationService['create']>(),
        send: vi.fn<EmailVerificationService['send']>(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        usersService.findByEmail.mockResolvedValue(user);
        usersService.findById.mockResolvedValue(publicUser);
        passwordService.hash.mockResolvedValue('unused-password-hash');
        passwordService.verify.mockResolvedValue(true);
        jwtService.signAsync.mockResolvedValue('signed-access-token');
        verificationService.getPending.mockResolvedValue(verification);
        verificationService.confirm.mockResolvedValue(user.id);

        const module = await Test.createTestingModule({
            providers: [
                { provide: UsersService, useValue: usersService },
                { provide: PasswordService, useValue: passwordService },
                { provide: JwtService, useValue: jwtService },
                { provide: PrismaService, useValue: {} },
                { provide: EmailVerificationService, useValue: verificationService },
                {
                    provide: AuthService,
                    inject: [UsersService, PasswordService, JwtService, PrismaService, EmailVerificationService],
                    useFactory: (
                        users: UsersService,
                        passwords: PasswordService,
                        jwt: JwtService,
                        prisma: PrismaService,
                        emailVerification: EmailVerificationService,
                    ) => new AuthService(users, passwords, jwt, prisma, emailVerification),
                },
            ],
        }).compile();

        service = module.get(AuthService);
    });

    describe('login', () => {
        it('should return the pending verification without creating a session or resetting its code', async () => {
            const result = await service.login(credentials);

            expect(result).toEqual({ nextStep: AUTH_NEXT_STEP.verifyEmail, verification });
            expect(usersService.findByEmail).toHaveBeenCalledWith(credentials.email);
            expect(passwordService.verify).toHaveBeenCalledWith(user.passwordHash, credentials.password);
            expect(verificationService.getPending).toHaveBeenCalledWith(user.id);
            expect(result).not.toHaveProperty('accessToken');
            expect(result).not.toHaveProperty('user');
            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(verificationService.create).not.toHaveBeenCalled();
            expect(verificationService.resend).not.toHaveBeenCalled();
            expect(verificationService.send).not.toHaveBeenCalled();
        });

        it('should reject an incorrect password before exposing pending verification', async () => {
            passwordService.verify.mockResolvedValue(false);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidCredentials,
            });

            expect(verificationService.getPending).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should reject an unknown email with the same error and perform dummy hashing', async () => {
            usersService.findByEmail.mockResolvedValue(null);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidCredentials,
            });

            expect(passwordService.hash).toHaveBeenCalledWith(credentials.password);
            expect(passwordService.verify).not.toHaveBeenCalled();
            expect(verificationService.getPending).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should authenticate a verified user and return only public user fields', async () => {
            usersService.findByEmail.mockResolvedValue({ ...user, emailVerifiedAt: user.createdAt });

            await expect(service.login(credentials)).resolves.toEqual({
                nextStep: AUTH_NEXT_STEP.authenticated,
                accessToken: 'signed-access-token',
                user: publicUser,
            });

            expect(jwtService.signAsync).toHaveBeenCalledExactlyOnceWith({ sub: user.id });
            expect(verificationService.getPending).not.toHaveBeenCalled();
        });

        it('should reject an unverified user whose verification context is unavailable', async () => {
            verificationService.getPending.mockResolvedValue(null);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 403,
                response: AUTH_ERRORS.emailNotVerified,
            });

            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(verificationService.create).not.toHaveBeenCalled();
            expect(verificationService.send).not.toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('should confirm the code and load the user before issuing a JWT', async () => {
            verificationService.confirm.mockImplementation(async () => {
                await Promise.resolve();
                expect(usersService.findById).not.toHaveBeenCalled();
                expect(jwtService.signAsync).not.toHaveBeenCalled();
                return user.id;
            });
            usersService.findById.mockImplementation(async () => {
                await Promise.resolve();
                expect(jwtService.signAsync).not.toHaveBeenCalled();
                return publicUser;
            });

            await expect(service.verifyEmail({ verificationId: verification.id, code: '123456' })).resolves.toEqual({
                accessToken: 'signed-access-token',
                user: publicUser,
            });

            expect(verificationService.confirm).toHaveBeenCalledWith(verification.id, '123456');
            expect(usersService.findById).toHaveBeenCalledWith(user.id);
            expect(verificationService.confirm).toHaveBeenCalledBefore(usersService.findById);
            expect(usersService.findById).toHaveBeenCalledBefore(jwtService.signAsync);
            expect(jwtService.signAsync).toHaveBeenCalledExactlyOnceWith({ sub: user.id });
        });

        it('should propagate a rejected code without looking up the user or creating a JWT', async () => {
            const error = new BadRequestException(AUTH_ERRORS.emailVerificationCodeInvalid.message, {
                errorCode: AUTH_ERRORS.emailVerificationCodeInvalid.errorCode,
            });
            verificationService.confirm.mockRejectedValue(error);

            await expect(service.verifyEmail({ verificationId: verification.id, code: '999999' })).rejects.toBe(error);

            expect(usersService.findById).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should not issue a JWT when the user no longer exists after confirmation', async () => {
            usersService.findById.mockResolvedValue(null);

            await expect(service.verifyEmail({ verificationId: verification.id, code: '123456' })).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.authenticationRequired,
            });

            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });
    });

    describe('resendVerification', () => {
        it('should delegate resending to email verification without issuing a JWT', async () => {
            const result = { verification: { ...verification, emailSent: true } };
            verificationService.resend.mockResolvedValue(result);

            await expect(service.resendVerification({ verificationId: verification.id })).resolves.toEqual(result);

            expect(verificationService.resend).toHaveBeenCalledExactlyOnceWith(verification.id);
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });
    });
});
