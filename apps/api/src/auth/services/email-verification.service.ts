import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';
import { createEmailVerificationMail } from '../templates/email-verification-mail.js';
import { EmailVerificationCodeService } from './email-verification-code.service.js';

@Injectable()
export class EmailVerificationService {
    private readonly logger = new Logger(EmailVerificationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly codeService: EmailVerificationCodeService,
        private readonly mailService: MailService,
    ) { }

    async create(
        userId: string,
        database: Prisma.TransactionClient = this.prisma,
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

        await database.emailVerification.create({
            data: {
                id: verificationId,
                userId,
                codeHash,
                expiresAt,
            },
            select: {
                id: true,
            },
        });

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
}
