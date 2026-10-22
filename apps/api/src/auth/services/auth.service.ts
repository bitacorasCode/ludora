import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { LoginDto } from '../dto/login.dto.js';
import type { RegisterDto } from '../dto/register.dto.js';
import type { VerifyEmailDto } from '../dto/verify-email.dto.js';
import { EmailVerificationService } from './email-verification.service.js';
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
            async (transaction) => {
                const user = await this.usersService.create(
                    {
                        nickname: data.nickname,
                        email: data.email,
                        passwordHash,
                    },
                    transaction,
                );

                const verification =
                    await this.emailVerificationService.create(
                        user.id,
                        transaction,
                    );

                return {
                    user,
                    verification,
                };
            },
        );

        const { verificationId, code, expiresAt } = verification;

        const emailSent = await this.emailVerificationService.send(
            user.email,
            code,
        );

        return {
            user,
            verification: {
                id: verificationId,
                expiresAt,
                emailSent,
            },
        };
    }

    async verifyEmail(data: VerifyEmailDto) {
        const { verificationId, code } = data;

        const userId = await this.emailVerificationService.confirm(
            verificationId,
            code,
        );

        const { user } = await this.getCurrentUser(userId);

        return this.createAuthResponse(user);
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

        if (!user.emailVerifiedAt) {
            const { message, errorCode } = AUTH_ERRORS.emailNotVerified;

            throw new ForbiddenException(message, {
                errorCode,
            });
        }

        return this.createAuthResponse(user);
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

    private async createAuthResponse(
        user: Pick<User, 'id' | 'nickname' | 'email' | 'createdAt'>,
    ) {
        const { id, nickname, email, createdAt } = user;

        const accessToken = await this.jwtService.signAsync({
            sub: id,
        });

        return {
            accessToken,
            user: {
                id,
                nickname,
                email,
                createdAt,
            },
        };
    }
}
