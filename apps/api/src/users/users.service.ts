import { Injectable } from '@nestjs/common';

import type { Prisma, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type CreateUserData = Pick<
    User,
    'nickname' | 'email' | 'passwordHash'
>;

const userResponseSelect = {
    id: true,
    nickname: true,
    email: true,
    createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    create(data: CreateUserData) {
        return this.prisma.user.create({
            data: {
                nickname: data.nickname.trim(),
                email: data.email.trim().toLowerCase(),
                passwordHash: data.passwordHash,
            },
            select: userResponseSelect
        });
    }

    findByEmail(email: string): Promise<User | null> {
        const normalizedEmail = email.trim().toLowerCase();

        return this.prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });
    }

    findById(id: string) {
        return this.prisma.user.findUnique({
            where: {
                id,
            },
            select: userResponseSelect,
        });
    }
}