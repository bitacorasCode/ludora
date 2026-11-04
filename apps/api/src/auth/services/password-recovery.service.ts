import { setImmediate } from 'node:timers';

import { parseHttpUrl } from '@ludora/security/server';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { createPasswordChangedMail } from '../templates/password-changed-mail.js';
import { createPasswordResetMail } from '../templates/password-reset-mail.js';
import { PasswordService } from './password.service.js';
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
        private readonly passwordService: PasswordService,
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

    async reset(token: string, password: string): Promise<void> {
        const { message, errorCode } = AUTH_ERRORS.passwordResetInvalid;
        const tokenHash = this.tokenService.hash(token);
        const reset = await this.resetRepository.findByTokenHash(tokenHash);

        if (!reset || reset.expiresAt.getTime() <= Date.now()) {
            throw new BadRequestException(message, { errorCode });
        }

        const { userId } = reset;
        const passwordHash = await this.passwordService.hash(password);

        const { email: recipient } = await this.prisma.$transaction(async (transaction) => {
            const consumed = await this.resetRepository.consume(
                { tokenHash, now: new Date() },
                transaction,
            );

            if (!consumed) {
                throw new BadRequestException(message, { errorCode });
            }

            return this.usersService.updatePassword(userId, passwordHash, transaction);
        });

        // The change is committed; SMTP must not delay or fail its HTTP response.
        setImmediate(() => {
            void this.sendPasswordChangedNotice(recipient).catch(() => {
                this.logger.error('Could not send password change notification.');
            });
        });
    }

    private async sendPasswordChangedNotice(to: string): Promise<void> {
        const message = createPasswordChangedMail();

        await this.mailService.send({ to, ...message });
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
