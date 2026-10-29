import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception.js';
import type { ApiErrorDefinition } from '../../common/types/api-error-definition.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';
import { EmailVerificationRepository } from '../repositories/index.js';
import { createEmailVerificationMail } from '../templates/email-verification-mail.js';
import { EmailVerificationCodeService } from './email-verification-code.service.js';

type ConfirmEmailResult =
    | { userId: string }
    | { error: ApiErrorDefinition };

@Injectable()
export class EmailVerificationService {
    private readonly logger = new Logger(EmailVerificationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly codeService: EmailVerificationCodeService,
        private readonly mailService: MailService,
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
                lastSentAt.getTime() + resendCooldownSeconds * 1_000,
            ),
        };
    }

    async create(
        userId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const { expiresInSeconds, resendCooldownSeconds } = EMAIL_VERIFICATION_CONFIG;

        const verificationId = randomUUID();
        const code = this.codeService.generate();

        const codeHash = this.codeService.hash(
            verificationId,
            code,
        );

        const lastSentAt = new Date();
        const expiresAt = new Date(lastSentAt.getTime() + expiresInSeconds * 1_000);
        const resendAvailableAt = new Date(
            lastSentAt.getTime() + resendCooldownSeconds * 1_000,
        );

        await this.verificationRepository.create(
            {
                id: verificationId,
                userId,
                codeHash,
                expiresAt,
                lastSentAt,
            },
            transaction,
        );

        return {
            verificationId,
            code,
            expiresAt,
            resendAvailableAt,
        };
    }

    async resend(verificationId: string) {
        const { expiresInSeconds, resendCooldownSeconds } = EMAIL_VERIFICATION_CONFIG;
        const cooldownMs = resendCooldownSeconds * 1_000;

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

            const { userId, lastSentAt } = verification;
            const resendAvailableAt = new Date(lastSentAt.getTime() + cooldownMs);

            if (!resendReserved) {
                const { message, errorCode } = AUTH_ERRORS.emailVerificationResendTooSoon;
                const retryAfterSeconds = Math.max(
                    1,
                    Math.ceil((resendAvailableAt.getTime() - Date.now()) / 1_000),
                );

                throw new TooManyRequestsException(message, {
                    errorCode,
                    retryAfterSeconds,
                });
            }

            const code = this.codeService.generate();
            const expiresAt = new Date(now.getTime() + expiresInSeconds * 1_000);
            const codeHash = this.codeService.hash(verificationId, code);

            await this.verificationRepository.renewCode(
                { id: verificationId, codeHash, expiresAt },
                transaction,
            );

            return { userId, code, expiresAt, resendAvailableAt };
        });

        const { userId, code, expiresAt, resendAvailableAt } = renewed;
        const user = await this.usersService.findById(userId);

        if (!user) {
            const { message, errorCode } = AUTH_ERRORS.emailVerificationInvalid;

            throw new BadRequestException(message, { errorCode });
        }

        const emailSent = await this.send(user.email, code);

        return {
            verification: {
                id: verificationId,
                expiresAt,
                emailSent,
                resendAvailableAt,
            },
        };
    }

    async send(to: string, code: string): Promise<boolean> {
        const { expiresInSeconds } = EMAIL_VERIFICATION_CONFIG;

        const message = createEmailVerificationMail({
            code,
            expiresInSeconds,
        });

        try {
            await this.mailService.send({
                to,
                ...message,
            });

            return true;
        } catch {
            this.logger.error(
                'Could not confirm verification email submission.',
            );

            return false;
        }
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
