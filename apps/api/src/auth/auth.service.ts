import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Prisma } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
    ) { }

    async register(data: RegisterDto) {
        const passwordHash = await this.passwordService.hash(data.password);

        try {
            const user = await this.usersService.create({
                nickname: data.nickname,
                email: data.email,
                passwordHash,
            });

            return { user };
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'Email or nickname already in use.',
                );
            }

            throw error;
        }
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
            throw new UnauthorizedException('Invalid credentials.');
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
}