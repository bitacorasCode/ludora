import { AUTH_NEXT_STEP } from '@ludora/contracts/auth';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/index.js';
import type {
    CompleteOAuthRegistrationDto,
    OAuthRegistrationContextDto,
} from '../dto/index.js';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository.js';
import type { ExternalIdentity } from '../schemas/external-identity.schema.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { OAuthFlowTokenService } from './oauth-flow-token.service.js';

@Injectable()
export class OAuthAccountService {
    constructor(
        private readonly authService: AuthService,
        private readonly authIdentityRepository: AuthIdentityRepository,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly oauthFlowTokenService: OAuthFlowTokenService,
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
    ) { }

    async resolveExternalIdentity(identity: ExternalIdentity) {
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

            return this.authService.createLoginResponse(user);
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

                const user = await this.usersService.create(
                    {
                        nickname,
                        email,
                        passwordHash: null,
                        emailVerifiedAt: isEmailVerified ? new Date() : null,
                    },
                    transaction,
                );

                await this.authIdentityRepository.create(
                    { userId: user.id, provider, providerUserId },
                    transaction,
                );

                const verification = user.emailVerifiedAt
                    ? null
                    : await this.emailVerificationService.create(user.id, transaction);

                return { user, verification };
            },
        );

        if (verification) {
            return {
                nextStep: AUTH_NEXT_STEP.verifyEmail,
                ...this.authService.createRegistrationResponse(user, verification),
            };
        }

        return this.authService.createLoginResponse(user);
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
}
