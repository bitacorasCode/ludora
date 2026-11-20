import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthSessionRepository } from '../repositories/auth-session.repository.js';

const SESSION_CLEANUP_BATCH_SIZE = 500;
const logger = new Logger('AuthSessionCleanup');

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    providers: [AuthSessionRepository],
})
class AuthSessionCleanupModule { }

async function cleanupAuthSessions() {
    const app = await NestFactory.createApplicationContext(AuthSessionCleanupModule, {
        abortOnError: false,
    });

    try {
        const sessions = app.get(AuthSessionRepository);
        const cutoff = new Date();
        let totalDeleted = 0;
        let candidatesSelected: number;

        do {
            const { selectedCount, deletedCount } = await sessions.deleteInactiveBatch(
                cutoff,
                SESSION_CLEANUP_BATCH_SIZE,
            );

            candidatesSelected = selectedCount;
            totalDeleted += deletedCount;
        } while (candidatesSelected === SESSION_CLEANUP_BATCH_SIZE);

        logger.log(`Deleted ${totalDeleted} expired or revoked authentication sessions.`);
    } finally {
        await app.close();
    }
}

try {
    await cleanupAuthSessions();
} catch (error) {
    logger.error('Authentication session cleanup failed.', error);
    process.exitCode = 1;
}
