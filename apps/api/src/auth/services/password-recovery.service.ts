import { setImmediate } from 'node:timers';

import { parseHttpUrl } from '@ludora/security/server';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { createPasswordResetMail } from '../templates/password-reset-mail.js';
import { PasswordResetTokenService } from './password-reset-token.service.js';

@Injectable()
export class PasswordRecoveryService {
    private readonly logger = new Logger(PasswordRecoveryService.name);
    private readonly resetUrl: URL;

    constructor(
        config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly tokenService: PasswordResetTokenService,
        private readonly resetRepository: PasswordResetRepository,
        private readonly mailService: MailService,
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

    request(email: string): void {
        // The caller does not wait for account lookup, reservation or SMTP.
        setImmediate(() => {
            void this.processRequest(email).catch(() => {
                this.logger.error('Could not process password recovery request.');
            });
        });
    }

    private async processRequest(email: string): Promise<void> {
        const user = await this.usersService.findByEmail(email);

        if (!user) return;

        const { id: userId, email: recipient } = user;
        const { requestCooldownSeconds, expiresInSeconds } = PASSWORD_RESET_CONFIG;
        const { token, tokenHash, expiresAt } = this.tokenService.create();

        const reserved = await this.prisma.$transaction((transaction) => {
            const lastSentAt = new Date();

            return this.resetRepository.reserveRequest(
                {
                    userId,
                    tokenHash,
                    expiresAt,
                    lastSentAt,
                    requestBefore: new Date(
                        lastSentAt.getTime() - requestCooldownSeconds * MILLISECONDS_PER_SECOND,
                    ),
                },
                transaction,
            );
        });

        if (!reserved) return;

        const resetUrl = new URL(this.resetUrl);
        resetUrl.search = new URLSearchParams({ token }).toString();
        const message = createPasswordResetMail({
            resetUrl: resetUrl.href,
            expiresInSeconds,
        });

        // Sending mail happens only after the reservation has committed.
        await this.mailService.send({ to: recipient, ...message });
    }
}
