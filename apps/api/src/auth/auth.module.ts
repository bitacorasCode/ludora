import { ACCESS_TOKEN_TTL_SECONDS } from '@ludora/security';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { InternalRequestModule } from '../common/internal-request.module.js';
import { MailModule } from '../mail/index.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { JWT_CONFIG } from './constants/jwt.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { EmailVerificationRepository } from './repositories/index.js';
import {
    AuthService,
    EmailVerificationCodeService,
    EmailVerificationService,
    PasswordService,
} from './services/index.js';

const { algorithm, issuer, audience } = JWT_CONFIG;

@Module({
    imports: [
        InternalRequestModule,
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
        AuthService,
        PasswordService,
        JwtAuthGuard,
        EmailVerificationCodeService,
        EmailVerificationService
    ],
})
export class AuthModule { }
