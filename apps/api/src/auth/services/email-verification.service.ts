import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

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

    async create(
        userId: string,
        transaction?: Prisma.TransactionClient,
    ) {
        const { expiresInSeconds } = EMAIL_VERIFICATION_CONFIG;

        const verificationId = randomUUID();
        const code = this.codeService.generate();

        const codeHash = this.codeService.hash(
            verificationId,
            code,
        );

        const expiresAt = new Date(
            Date.now() + expiresInSeconds * 1_000,
        );

        await this.verificationRepository.create(
            {
                id: verificationId,
                userId,
                codeHash,
                expiresAt,
            },
            transaction,
        );

        return {
            verificationId,
            code,
            expiresAt,
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
