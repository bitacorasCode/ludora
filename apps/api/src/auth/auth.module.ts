import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PasswordService } from './password.service.js';

@Module({
    imports: [
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
    providers: [AuthService, PasswordService, JwtAuthGuard],
})
export class AuthModule { }