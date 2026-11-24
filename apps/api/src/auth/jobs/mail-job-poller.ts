import type { LoggerService } from '@nestjs/common';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { AUTH_MAIL_QUEUE } from '../constants/mail-queue.js';

export class MailJobPoller {
    private timer?: ReturnType<typeof setTimeout>;
    private activePoll?: Promise<void>;
    private stopping = false;
    private nextBacklogWarningAtMs = 0;

    constructor(
        private readonly processNext: () => Promise<boolean>,
        private readonly reportError: () => void,
    ) {}

    start(): void {
        this.timer = setTimeout(() => {
            this.activePoll = this.processBatch()
                .catch(() => this.reportError())
                .finally(() => {
                    if (!this.stopping) this.start();
                });
        }, AUTH_MAIL_QUEUE.pollIntervalMs);
        this.timer.unref();
    }

    async stop(): Promise<void> {
        this.stopping = true;
        clearTimeout(this.timer);
        await this.activePoll;
    }

    warnIfBacklogged(readySince: Date, now: Date, logger: LoggerService): void {
        const { backlogWarningThresholdMs, backlogWarningIntervalMs } = AUTH_MAIL_QUEUE;
        const nowMs = now.getTime();
        const waitMs = nowMs - readySince.getTime();

        if (waitMs < backlogWarningThresholdMs || nowMs < this.nextBacklogWarningAtMs) return;

        this.nextBacklogWarningAtMs = nowMs + backlogWarningIntervalMs;
        const waitSeconds = Math.floor(waitMs / MILLISECONDS_PER_SECOND);

        logger.warn(`Mail queue backlog detected. Oldest ready job waited ${waitSeconds} seconds.`);
    }

    private async processBatch(): Promise<void> {
        for (let processed = 0; processed < AUTH_MAIL_QUEUE.batchSize && !this.stopping; processed += 1) {
            if (!(await this.processNext())) break;
        }
    }
}
