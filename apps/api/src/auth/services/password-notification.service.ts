import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import { MILLISECONDS_PER_SECOND, SECONDS_PER_DAY } from '../../common/constants/time.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/index.js';
import { AUTH_MAIL_QUEUE } from '../constants/mail-queue.js';
import { MailJobPoller } from '../jobs/mail-job-poller.js';
import { PasswordNotificationJobRepository } from '../repositories/password-notification-job.repository.js';
import { createPasswordChangedMail } from '../templates/password-changed-mail.js';

const PASSWORD_NOTIFICATION_MAX_AGE_MS = SECONDS_PER_DAY * MILLISECONDS_PER_SECOND;

@Injectable()
export class PasswordNotificationService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(PasswordNotificationService.name);
    private readonly poller = new MailJobPoller(
        () => this.processNext(),
        () => this.logger.error('Could not process the password notification queue.'),
    );

    constructor(
        private readonly mailService: MailService,
        private readonly jobs: PasswordNotificationJobRepository,
    ) {}

    enqueuePasswordChanged(userId: string, isFirstPassword: boolean, transaction: Prisma.TransactionClient): Promise<void> {
        return this.jobs.enqueue(userId, isFirstPassword, transaction);
    }

    onApplicationBootstrap(): void {
        this.poller.start();
    }

    onModuleDestroy(): Promise<void> {
        return this.poller.stop();
    }

    private async processNext(): Promise<boolean> {
        const { leaseDurationMs, maxAttempts, retryDelayMs } = AUTH_MAIL_QUEUE;
        const now = new Date();
        const job = await this.jobs.claimNext(now, new Date(now.getTime() + leaseDurationMs));

        if (!job) return false;

        const expiresAtMs = job.createdAt.getTime() + PASSWORD_NOTIFICATION_MAX_AGE_MS;

        if (job.attempts <= maxAttempts && Date.now() < expiresAtMs) {
            try {
                const message = createPasswordChangedMail(job.isFirstPassword);
                await this.mailService.send({ to: job.user.email, ...message }, { idempotencyKey: job.id });
            } catch {
                this.logger.warn('Could not send a password update notification.');
                const retryAtMs = Date.now() + retryDelayMs;

                if (job.attempts < maxAttempts && retryAtMs < expiresAtMs) {
                    await this.jobs.retry(job, new Date(retryAtMs));
                    return true;
                }
            }
        }

        await this.jobs.remove(job);

        return true;
    }
}
