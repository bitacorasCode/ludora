import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
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
}