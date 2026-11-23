import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception.js';
import type { ApiErrorDefinition } from '../../common/types/api-error-definition.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS, EMAIL_VERIFICATION_CONFIG } from '../constants/index.js';
import { EmailVerificationRepository } from '../repositories/index.js';
import { EmailVerificationCodeService } from './email-verification-code.service.js';

type ConfirmEmailResult =
    | { userId: string }
    | { error: ApiErrorDefinition };

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly codeService: EmailVerificationCodeService,
        private readonly verificationRepository: EmailVerificationRepository,
        private readonly usersService: UsersService,
    ) { }

    async getPending(userId: string) {
        const verification = await this.verificationRepository.findPendingByUserId(
            userId,
        );

        if (!verification) return null;

        const { id, expiresAt, lastSentAt } = verification;
        const { resendCooldownSeconds } = EMAIL_VERIFICATION_CONFIG;

        return {
            id,
            expiresAt,
            resendAvailableAt: new Date(
                lastSentAt.getTime() + resendCooldownSeconds * MILLISECONDS_PER_SECOND,
            ),
        };
    }

    async create(
        userId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const { resendCooldownSeconds } = EMAIL_VERIFICATION_CONFIG;
        const verificationId = randomUUID();
        const lastSentAt = new Date();
        const delivery = this.createDelivery(verificationId, lastSentAt);
        const resendAvailableAt = new Date(
            lastSentAt.getTime() + resendCooldownSeconds * MILLISECONDS_PER_SECOND,
        );

        await this.verificationRepository.create(
            {
                id: verificationId,
                userId,
                lastSentAt,
                ...delivery,
            },
            transaction,
        );

        return {
            verificationId,
            expiresAt: delivery.expiresAt,
            resendAvailableAt,
        };
    }

    async resend(verificationId: string) {
        const {
            resendCooldownSeconds,
            minRetryAfterSeconds,
        } = EMAIL_VERIFICATION_CONFIG;
        const cooldownMs = resendCooldownSeconds * MILLISECONDS_PER_SECOND;

        const renewed = await this.prisma.$transaction(async (transaction) => {
            const now = new Date();
            const resendReserved = await this.verificationRepository.reserveResend(
                {
                    verificationId,
                    now,
                    resendBefore: new Date(now.getTime() - cooldownMs),
                },
                transaction,
            );

            const verification = await this.verificationRepository.findPendingById(
                verificationId,
                transaction,
            );

            if (!verification) {
                const { message, errorCode } = AUTH_ERRORS.emailVerificationInvalid;

                throw new BadRequestException(message, { errorCode });
            }

            const { lastSentAt } = verification;
            const resendAvailableAt = new Date(lastSentAt.getTime() + cooldownMs);

            if (!resendReserved) {
                const { message, errorCode } = AUTH_ERRORS.emailVerificationResendTooSoon;
                const retryAfterSeconds = Math.max(
                    minRetryAfterSeconds,
                    Math.ceil(
                        (resendAvailableAt.getTime() - Date.now()) / MILLISECONDS_PER_SECOND,
                    ),
                );

                throw new TooManyRequestsException(message, {
                    errorCode,
                    retryAfterSeconds,
                });
            }

            const delivery = this.createDelivery(verificationId, now);

            await this.verificationRepository.renewCode(
                { id: verificationId, ...delivery },
                transaction,
            );

            return { expiresAt: delivery.expiresAt, resendAvailableAt };
        });

        return {
            verification: {
                id: verificationId,
                ...renewed,
                emailSent: false,
                emailQueued: true,
            },
        };
    }

    private createDelivery(verificationId: string, now: Date) {
        const { expiresInSeconds } = EMAIL_VERIFICATION_CONFIG;
        const deliveryId = randomUUID();
        const code = this.codeService.generateForDelivery(verificationId, deliveryId);

        return {
            codeHash: this.codeService.hash(verificationId, code),
            expiresAt: new Date(now.getTime() + expiresInSeconds * MILLISECONDS_PER_SECOND),
            deliveryId,
            deliveryAvailableAt: now,
            deliveryAttempts: 0,
        };
    }

    async confirm(
        verificationId: string,
        code: string,
    ): Promise<string> {
        const { maxFailedAttempts } = EMAIL_VERIFICATION_CONFIG;

        const result = await this.prisma.$transaction(
            async (transaction): Promise<ConfirmEmailResult> => {
                const attemptReserved =
                    await this.verificationRepository.reserveAttempt(
                        {
                            verificationId,
                            now: new Date(),
                            maxFailedAttempts,
                        },
                        transaction,
                    );

                const verification =
                    await this.verificationRepository.findById(
                        verificationId,
                        transaction,
                    );

                if (!verification) {
                    return {
                        error: AUTH_ERRORS.emailVerificationInvalid,
                    };
                }

                const {
                    id,
                    userId,
                    codeHash,
                    expiresAt,
                    failedAttempts,
                } = verification;

                if (expiresAt.getTime() <= Date.now()) {
                    return {
                        error: AUTH_ERRORS.emailVerificationExpired,
                    };
                }

                if (!attemptReserved) {
                    return {
                        error: AUTH_ERRORS.emailVerificationAttemptsExceeded,
                    };
                }

                const isCodeValid = this.codeService.verify(
                    id,
                    code,
                    codeHash,
                );

                if (!isCodeValid) {
                    if (failedAttempts >= maxFailedAttempts) {
                        return {
                            error: AUTH_ERRORS.emailVerificationAttemptsExceeded,
                        };
                    }

                    return {
                        error: AUTH_ERRORS.emailVerificationCodeInvalid,
                    };
                }

                const userVerified =
                    await this.usersService.markEmailVerifiedIfPending(
                        userId,
                        transaction,
                    );

                if (!userVerified) {
                    return {
                        error: AUTH_ERRORS.emailVerificationInvalid,
                    };
                }

                await this.verificationRepository.delete(id, transaction);

                return {
                    userId,
                };
            },
        );

        if ('error' in result) {
            const { message, errorCode } = result.error;

            throw new BadRequestException(message, {
                errorCode,
            });
        }

        return result.userId;
    }
}
