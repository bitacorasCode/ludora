import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';
import { EmailVerificationCodeService } from './email-verification-code.service.js';

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly codeService: EmailVerificationCodeService,
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
}
