import { AUTH_NEXT_STEP } from '@ludora/security';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import type {
    ChangePasswordDto,
    LoginDto,
    RegisterDto,
    ResendVerificationDto,
    VerifyEmailDto,
} from '../dto/index.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordService } from './password.service.js';
import { PasswordNotificationService } from './password-notification.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly passwordResetRepository: PasswordResetRepository,
        private readonly passwordNotificationService: PasswordNotificationService,
    ) { }

    async register(data: RegisterDto) {
        const passwordHash = await this.passwordService.hash(
            data.password,
        );

        const { user, verification } = await this.prisma.$transaction(
            async (transaction) => {
                const user = await this.usersService.create(
                    {
                        nickname: data.nickname,
                        email: data.email,
                        passwordHash,
                    },
                    transaction,
                );

                const verification =
                    await this.emailVerificationService.create(
                        user.id,
                        transaction,
                    );

                return {
                    user,
                    verification,
                };
            },
        );

        const { verificationId, code, expiresAt, resendAvailableAt } = verification;

        const emailSent = await this.emailVerificationService.send(
            user.email,
            code,
        );

        return {
            user,
            verification: {
                id: verificationId,
                expiresAt,
                emailSent,
                resendAvailableAt,
            },
        };
    }

    resendVerification({ verificationId }: ResendVerificationDto) {
        return this.emailVerificationService.resend(verificationId);
    }

    async verifyEmail(data: VerifyEmailDto) {
        const { verificationId, code } = data;

        const userId = await this.emailVerificationService.confirm(
            verificationId,
            code,
        );

        const user = await this.usersService.findAuthenticationById(userId);

        if (!user?.emailVerifiedAt) {
            const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

            throw new UnauthorizedException(message, { errorCode });
        }

        return this.createAuthResponse(user);
    }

    async login(data: LoginDto) {
        const user = await this.usersService.findByEmail(data.email);

        let isPasswordValid = false;

        if (user) {
            isPasswordValid = await this.passwordService.verify(
                user.passwordHash,
                data.password,
            );
        } else {
            await this.passwordService.hash(data.password);
        }

        if (!user || !isPasswordValid) {
            const { message, errorCode } = AUTH_ERRORS.invalidCredentials;

            throw new UnauthorizedException(message, {
                errorCode,
            });
        }

        if (!user.emailVerifiedAt) {
            const verification = await this.emailVerificationService.getPending(
                user.id,
            );

            if (verification) {
                return {
                    nextStep: AUTH_NEXT_STEP.verifyEmail,
                    verification,
                };
            }

            const { message, errorCode } = AUTH_ERRORS.emailNotVerified;

            throw new ForbiddenException(message, {
                errorCode,
            });
        }

        return {
            nextStep: AUTH_NEXT_STEP.authenticated,
            ...await this.createAuthResponse(user),
        };
    }

    async getCurrentUser(userId: string) {
        const user = await this.usersService.findCurrentById(userId);

        if (!user) {
            const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

            throw new UnauthorizedException(message, {
                errorCode,
            });
        }

        const { profile, ...publicUser } = user;

        return { user: { ...publicUser, avatarPresetId: profile?.avatarPresetId ?? null } };
    }

    async changePassword(userId: string, expectedAuthVersion: number, data: ChangePasswordDto) {
        const user = await this.usersService.findPasswordById(userId);

        if (!user?.emailVerifiedAt || user.authVersion !== expectedAuthVersion) {
            const { message, errorCode } = AUTH_ERRORS.invalidToken;
            throw new UnauthorizedException(message, { errorCode });
        }

        const isCurrentPasswordValid = await this.passwordService.verify(
            user.passwordHash,
            data.currentPassword,
        );

        if (!isCurrentPasswordValid) {
            const { message, errorCode } = AUTH_ERRORS.currentPasswordInvalid;
            throw new BadRequestException(message, { errorCode });
        }

        if (data.password === data.currentPassword) {
            const { message, errorCode } = AUTH_ERRORS.passwordUnchanged;
            throw new BadRequestException(message, { errorCode });
        }

        const passwordHash = await this.passwordService.hash(data.password);

        const updatedUser = await this.prisma.$transaction(async (transaction) => {
            // Match recovery's lock order: reset rows first, then the user row.
            await this.passwordResetRepository.deleteForUser(userId, transaction);
            const changed = await this.usersService.changePasswordIfCurrent({
                userId,
                passwordHash,
                expectedPasswordHash: user.passwordHash,
                expectedAuthVersion,
            }, transaction);

            if (!changed) {
                const { message, errorCode } = AUTH_ERRORS.invalidToken;
                throw new UnauthorizedException(message, { errorCode });
            }

            const updated = await this.usersService.findAuthenticationById(userId, transaction);

            if (!updated?.emailVerifiedAt) {
                const { message, errorCode } = AUTH_ERRORS.invalidToken;
                throw new UnauthorizedException(message, { errorCode });
            }

            return updated;
        });

        this.passwordNotificationService.passwordChanged(updatedUser.email);

        return this.createAuthResponse(updatedUser);
    }

    private async createAuthResponse(
        user: Pick<User, 'id' | 'nickname' | 'email' | 'createdAt' | 'authVersion'>,
    ) {
        const { id, nickname, email, createdAt, authVersion } = user;

        const accessToken = await this.jwtService.signAsync({
            sub: id,
            authVersion,
        });

        return {
            accessToken,
            user: {
                id,
                nickname,
                email,
                createdAt,
            },
        };
    }
}
