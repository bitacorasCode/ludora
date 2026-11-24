import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import { MailService } from '../../mail/index.js';
import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';
import { AUTH_MAIL_QUEUE, AUTH_MAIL_QUEUE_LOGS } from '../constants/mail-queue.js';
import { EmailVerificationRepository } from '../repositories/email-verification.repository.js';
import { EmailVerificationCodeService } from '../services/email-verification-code.service.js';
import { createEmailVerificationMail } from '../templates/email-verification-mail.js';
import { MailJobPoller } from './mail-job-poller.js';

type ClaimedDelivery = NonNullable<Awaited<ReturnType<EmailVerificationRepository['claimNextDelivery']>>>;

@Injectable()
export class EmailVerificationWorker implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(EmailVerificationWorker.name);
    private readonly poller = new MailJobPoller(
        () => this.processNext(),
        () => this.logger.error('Could not process the email verification queue.'),
    );

    constructor(
        private readonly verifications: EmailVerificationRepository,
        private readonly codes: EmailVerificationCodeService,
        private readonly mail: MailService,
    ) {}

    onApplicationBootstrap(): void {
        this.poller.start();
    }

    onModuleDestroy(): Promise<void> {
        return this.poller.stop();
    }

    private async processNext(): Promise<boolean> {
        const { leaseDurationMs, maxAttempts, retryDelayMs } = AUTH_MAIL_QUEUE;
        const now = new Date();
        const job = await this.verifications.claimNextDelivery(now, new Date(now.getTime() + leaseDurationMs));

        if (!job) return false;

        this.poller.warnIfBacklogged(job.readySince, now, this.logger);

        if (job.deliveryAttempts > maxAttempts) {
            this.logger.error(AUTH_MAIL_QUEUE_LOGS.attemptsExhausted);
        } else {
            try {
                await this.deliver(job);
            } catch {
                const retryAtMs = Date.now() + retryDelayMs;

                if (job.deliveryAttempts < maxAttempts && retryAtMs < job.expiresAt.getTime()) {
                    await this.verifications.setDeliveryAvailability(job, new Date(retryAtMs));
                    this.logger.warn(AUTH_MAIL_QUEUE_LOGS.retryScheduled);
                    return true;
                }

                this.logger.error(
                    job.deliveryAttempts === maxAttempts
                        ? AUTH_MAIL_QUEUE_LOGS.attemptsExhausted
                        : AUTH_MAIL_QUEUE_LOGS.retryPastDeadline,
                );
            }
        }

        await this.verifications.setDeliveryAvailability(job, null);

        return true;
    }

    private async deliver(job: ClaimedDelivery): Promise<void> {
        const delivery = await this.verifications.findClaimedDelivery(job, new Date());

        if (!delivery) return;

        const { id, deliveryId } = job;
        const code = this.codes.generateForDelivery(id, deliveryId);

        if (!this.codes.verify(id, code, delivery.codeHash)) {
            this.logger.warn('Could not reconstruct an eligible email verification code.');
            return;
        }

        const message = createEmailVerificationMail({ code, expiresInSeconds: EMAIL_VERIFICATION_CONFIG.expiresInSeconds });

        await this.mail.send({ to: delivery.user.email, ...message }, { idempotencyKey: deliveryId });
    }
}
