import { PASSWORD_FORM_MODE } from '@ludora/security';
import { parseHttpUrl } from '@ludora/security/server';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import type { PasswordRecoveryJob } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS, PASSWORD_RESET_CONFIG } from '../constants/index.js';
import { PasswordRecoveryJobRepository, PasswordResetRepository } from '../repositories/index.js';
import { createPasswordResetMail } from '../templates/password-reset-mail.js';
import { PasswordService } from './password.service.js';
import { PasswordNotificationService } from './password-notification.service.js';
import { PasswordResetTokenService } from './password-reset-token.service.js';

@Injectable()
export class PasswordRecoveryService {
    private readonly resetUrl: URL;

    constructor(
        config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly tokenService: PasswordResetTokenService,
        private readonly resetRepository: PasswordResetRepository,
        private readonly jobs: PasswordRecoveryJobRepository,
        private readonly mailService: MailService,
        private readonly passwordService: PasswordService,
        private readonly passwordNotificationService: PasswordNotificationService,
    ) {
        const resetUrl = parseHttpUrl(
            config.get<string>('PASSWORD_RESET_URL'),
            config.get<string>('NODE_ENV'),
        );

        if (!resetUrl || resetUrl.search || resetUrl.hash) {
            throw new Error(
                'PASSWORD_RESET_URL must use HTTPS without credentials, query or fragment. HTTP is only allowed for loopback hosts in development or tests.',
            );
        }

        this.resetUrl = resetUrl;
    }

    request(email: string): Promise<void> {
        return this.jobs.enqueue(email);
    }

    async reset(token: string, password: string): Promise<void> {
        const { message, errorCode } = AUTH_ERRORS.passwordResetInvalid;
        const tokenHash = this.tokenService.hash(token);
        const reset = await this.resetRepository.findByTokenHash(tokenHash);

        if (!reset || reset.expiresAt.getTime() <= Date.now()) {
            throw new BadRequestException(message, { errorCode });
        }

        const { userId, user } = reset;
        const isFirstPassword = user.passwordHash === null;
        const passwordHash = await this.passwordService.hash(password);

        await this.prisma.$transaction(async (transaction) => {
            const consumed = await this.resetRepository.consume(
                { tokenHash, now: new Date() },
                transaction,
            );

            if (!consumed) {
                throw new BadRequestException(message, { errorCode });
            }

            await this.usersService.updatePassword(userId, passwordHash, transaction);
            await this.passwordNotificationService.enqueuePasswordChanged(userId, isFirstPassword, transaction);
        });
    }

    async processRequest(job: PasswordRecoveryJob): Promise<void> {
        const user = await this.usersService.findByEmail(job.email);

        if (!user) return;

        const { id: userId, email: recipient } = user;
        const { token, tokenHash } = this.tokenService.createForJob(job.id);

        if (!job.prepared && !(await this.prepareRequest(job, userId, tokenHash))) return;

        const reset = await this.resetRepository.findByTokenHash(tokenHash);

        if (reset?.userId !== userId || reset.expiresAt.getTime() <= Date.now()) return;

        const hasPassword = user.passwordHash !== null;
        const mode = hasPassword ? PASSWORD_FORM_MODE.reset : PASSWORD_FORM_MODE.create;
        const resetUrl = new URL(this.resetUrl);
        resetUrl.search = new URLSearchParams({ token, mode }).toString();
        const message = createPasswordResetMail({
            resetUrl: resetUrl.href,
            expiresInSeconds: PASSWORD_RESET_CONFIG.expiresInSeconds,
            hasPassword,
        });

        // Sending mail happens only after the reservation has committed.
        await this.mailService.send({ to: recipient, ...message });
    }

    private prepareRequest(job: PasswordRecoveryJob, userId: string, tokenHash: string): Promise<boolean> {
        const { requestCooldownSeconds, expiresInSeconds } = PASSWORD_RESET_CONFIG;

        return this.prisma.$transaction(async (transaction) => {
            // Commit the prepared marker with the reservation so a consumed token cannot be recreated.
            if (!(await this.jobs.markPrepared(job, transaction))) return false;

            const lastSentAt = new Date();
            const nowMs = lastSentAt.getTime();

            return this.resetRepository.reserveRequest(
                {
                    userId,
                    tokenHash,
                    expiresAt: new Date(nowMs + expiresInSeconds * MILLISECONDS_PER_SECOND),
                    lastSentAt,
                    requestBefore: new Date(nowMs - requestCooldownSeconds * MILLISECONDS_PER_SECOND),
                },
                transaction,
            );
        });
    }
}
