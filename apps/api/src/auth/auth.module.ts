import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { ClientIpModule } from '../common/client-ip.module.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { MailModule } from '../mail/index.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import {
    EmailVerificationRepository,
    PasswordResetRepository,
} from './repositories/index.js';
import {
    AuthService,
    EmailVerificationCodeService,
    EmailVerificationService,
    PasswordNotificationService,
    PasswordRecoveryService,
    PasswordResetTokenService,
    PasswordService,
} from './services/index.js';

const JWT_CONFIG = {
    algorithm: 'HS256',
    issuer: 'ludora-api',
    audience: 'ludora-web',
} as const;

const { algorithm, issuer, audience } = JWT_CONFIG;

@Module({
    imports: [
        ClientIpModule,
        MailModule,
        PrismaModule,
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): JwtModuleOptions => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    algorithm,
                    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
                    issuer,
                    audience,
                },
                verifyOptions: {
                    algorithms: [algorithm],
                    issuer,
                    audience,
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        EmailVerificationRepository,
        PasswordResetRepository,
        AuthService,
        PasswordService,
        PasswordNotificationService,
        PasswordResetTokenService,
        PasswordRecoveryService,
        JwtAuthGuard,
        RateLimitGuard,
        EmailVerificationCodeService,
        EmailVerificationService
    ],
    exports: [JwtModule, UsersModule],
})
export class AuthModule { }
