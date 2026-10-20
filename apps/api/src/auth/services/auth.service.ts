import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { LoginDto } from '../dto/login.dto.js';
import type { RegisterDto } from '../dto/register.dto.js';
import { EmailVerificationService } from './index.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly emailVerificationService: EmailVerificationService,
    ) { }

    async register(data: RegisterDto) {
        const passwordHash = await this.passwordService.hash(
            data.password,
        );

        const { user, verification } = await this.prisma.$transaction(
            async (database) => {
                const user = await this.usersService.create(
                    {
                        nickname: data.nickname,
                        email: data.email,
                        passwordHash,
                    },
                    database,
                );

                const verification =
                    await this.emailVerificationService.create(
                        user.id,
                        database,
                    );

                return {
                    user,
                    verification,
                };
            },
        );

        const { verificationId, expiresAt } = verification;

        return {
            user,
            verification: {
                id: verificationId,
                expiresAt,
            },
        };
    }

    async login(data: LoginDto) {
        const user = await this.usersService.findByEmail(data.email);

        let isPasswordValid = false;

        if (user) {
            isPasswordValid = await this.passwordService.verify(
                user.passwordHash,
                data.password,
            );
        } else {
            await this.passwordService.hash(data.password);
        }

        if (!user || !isPasswordValid) {
            const { message, errorCode } = AUTH_ERRORS.invalidCredentials;

            throw new UnauthorizedException(message, {
                errorCode,
            });
        }

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
        });

        return {
            accessToken,
            user: {
                id: user.id,
                nickname: user.nickname,
                email: user.email,
                createdAt: user.createdAt,
            },
        };
    }

    async getCurrentUser(userId: string) {
        const user = await this.usersService.findById(userId);

        if (!user) {
            const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

            throw new UnauthorizedException(message, {
                errorCode,
            });
        }

        return { user };
    }
}
