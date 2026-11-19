import { AUTH_NEXT_STEP } from '@ludora/security';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/index.js';
import type {
    ChangePasswordDto,
    CompleteOAuthRegistrationDto,
    GoogleCallbackDto,
    LoginDto,
    OAuthRegistrationContextDto,
    RegisterDto,
    ResendVerificationDto,
    VerifyEmailDto,
} from '../dto/index.js';
import { AuthIdentityRepository, PasswordResetRepository } from '../repositories/index.js';
import type { ExternalIdentity } from '../schemas/external-identity.schema.js';
import { EmailVerificationService } from './email-verification.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { OAuthFlowTokenService } from './oauth-flow-token.service.js';
import { PasswordService } from './password.service.js';
import { PasswordNotificationService } from './password-notification.service.js';

type AuthenticationUser = Pick<
    User,
    'id' | 'nickname' | 'email' | 'createdAt' | 'authVersion' | 'emailVerifiedAt'
>;

type PendingEmailVerification = Awaited<
    ReturnType<EmailVerificationService['create']>
>;

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
        private readonly authIdentityRepository: AuthIdentityRepository,
        private readonly googleAuthService: GoogleAuthService,
        private readonly oauthFlowTokenService: OAuthFlowTokenService,
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

        return this.createRegistrationResponse(user, verification);
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

        if (user?.passwordHash) {
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

        return this.createLoginResponse(user);
    }

    async loginWithGoogle({ flowToken, responseParameters }: GoogleCallbackDto) {
        const identity = await this.googleAuthService.verifyAuthorization(
            flowToken,
            responseParameters,
        );

        return this.resolveExternalIdentity(identity);
    }

    async completeOAuthRegistration({
        registrationToken,
        nickname,
        email: requestedEmail,
    }: CompleteOAuthRegistrationDto) {
        const identity = await this.oauthFlowTokenService.verifyRegistration(
            registrationToken,
        );
        const { provider, providerUserId } = identity;

        if (
            identity.email !== null
            && requestedEmail !== undefined
            && requestedEmail !== identity.email
        ) {
            const { message, errorCode } = AUTH_ERRORS.oauthEmailMismatch;

            throw new BadRequestException(message, { errorCode });
        }

        const email = identity.email ?? requestedEmail;

        if (!email) {
            const { message, errorCode } = AUTH_ERRORS.oauthEmailRequired;

            throw new BadRequestException(message, { errorCode });
        }

        const isEmailVerified = identity.email !== null && identity.emailVerified;

        const { user, verification } = await this.prisma.$transaction(
            async (transaction) => {
                const linkedIdentity = await this.authIdentityRepository.findByProviderUserId(
                    provider,
                    providerUserId,
                    transaction,
                );

                if (linkedIdentity) {
                    const { message, errorCode } = AUTH_ERRORS.oauthIdentityAlreadyLinked;

                    throw new ConflictException(message, { errorCode });
                }

                const existingUser = await this.usersService.findIdByEmail(
                    email,
                    transaction,
                );

                if (existingUser) {
                    const { message, errorCode } = AUTH_ERRORS.oauthAccountLinkRequired;

                    throw new ConflictException(message, { errorCode });
                }

                const createdUser = await this.usersService.create(
                    { nickname, email, passwordHash: null },
                    transaction,
                );

                await this.authIdentityRepository.create(
                    { userId: createdUser.id, provider, providerUserId },
                    transaction,
                );

                if (isEmailVerified) {
                    await this.usersService.markEmailVerifiedIfPending(
                        createdUser.id,
                        transaction,
                    );
                }

                const verification = isEmailVerified
                    ? null
                    : await this.emailVerificationService.create(
                        createdUser.id,
                        transaction,
                    );

                const user = await this.usersService.findAuthenticationById(
                    createdUser.id,
                    transaction,
                );

                if (!user) {
                    const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

                    throw new UnauthorizedException(message, { errorCode });
                }

                return { user, verification };
            },
        );

        if (verification) {
            return {
                nextStep: AUTH_NEXT_STEP.verifyEmail,
                ...await this.createRegistrationResponse(user, verification),
            };
        }

        return this.createLoginResponse(user);
    }

    async getOAuthRegistrationContext({ registrationToken }: OAuthRegistrationContextDto) {
        const { email, emailVerified, exp } =
            await this.oauthFlowTokenService.verifyRegistration(registrationToken);

        return {
            email,
            emailVerified,
            expiresAt: new Date(exp * MILLISECONDS_PER_SECOND),
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

        const { passwordHash: currentPasswordHash } = user;

        if (
            currentPasswordHash === null
            || !(await this.passwordService.verify(
                currentPasswordHash,
                data.currentPassword,
            ))
        ) {
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
                expectedPasswordHash: currentPasswordHash,
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

    private async createRegistrationResponse(
        user: Pick<User, 'id' | 'nickname' | 'email' | 'createdAt'>,
        verification: PendingEmailVerification,
    ) {
        const { id, nickname, email, createdAt } = user;
        const { verificationId, code, expiresAt, resendAvailableAt } = verification;
        const emailSent = await this.emailVerificationService.send(email, code);

        return {
            user: { id, nickname, email, createdAt },
            verification: {
                id: verificationId,
                expiresAt,
                emailSent,
                resendAvailableAt,
            },
        };
    }

    private async resolveExternalIdentity(identity: ExternalIdentity) {
        const { provider, providerUserId, email, emailVerified } = identity;
        const linkedIdentity = await this.authIdentityRepository.findByProviderUserId(
            provider,
            providerUserId,
        );

        if (linkedIdentity) {
            const user = await this.usersService.findAuthenticationById(
                linkedIdentity.userId,
            );

            if (!user) {
                const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

                throw new UnauthorizedException(message, { errorCode });
            }

            return this.createLoginResponse(user);
        }

        if (email !== null) {
            const existingUser = await this.usersService.findIdByEmail(email);

            if (existingUser) {
                const { message, errorCode } = AUTH_ERRORS.oauthAccountLinkRequired;

                throw new ConflictException(message, { errorCode });
            }
        }

        const registration = await this.oauthFlowTokenService.createRegistration(
            identity,
        );

        return {
            nextStep: AUTH_NEXT_STEP.completeRegistration,
            registration: { ...registration, email, emailVerified },
        };
    }

    private async createLoginResponse(user: AuthenticationUser) {
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

            throw new ForbiddenException(message, { errorCode });
        }

        return {
            nextStep: AUTH_NEXT_STEP.authenticated,
            ...await this.createAuthResponse(user),
        };
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
