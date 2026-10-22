import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { MailModule } from '../mail/index.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { EmailVerificationRepository } from './repositories/index.js';
import {
    AuthService,
    EmailVerificationCodeService,
    EmailVerificationService,
    PasswordService,
} from './services/index.js';

@Module({
    imports: [
        MailModule,
        PrismaModule,
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService): JwtModuleOptions => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    algorithm: 'HS256',
                    expiresIn: '15m',
                    issuer: 'ludora-api',
                    audience: 'ludora-web',
                },
                verifyOptions: {
                    algorithms: ['HS256'],
                    issuer: 'ludora-api',
                    audience: 'ludora-web',
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
