import { Injectable } from '@nestjs/common';

import type { Prisma, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type CreateUserData = Pick<
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
export class UsersRepository {
    constructor(private readonly prisma: PrismaService) {}

    create(
        data: CreateUserData,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.user.create({
            data,
            select: userResponseSelect,
        });
    }

    findByEmail(
        email: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ): Promise<User | null> {
        return transaction.user.findUnique({
            where: { email },
        });
    }

    findById(
        id: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.user.findUnique({
            where: { id },
            select: userResponseSelect,
        });
    }

    async markEmailVerifiedIfPending(
        id: string,
        verifiedAt: Date,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.user.updateMany({
            where: {
                id,
                emailVerifiedAt: null,
            },
            data: {
                emailVerifiedAt: verifiedAt,
            },
        });

        return count === 1;
    }

    count(transaction: Prisma.TransactionClient = this.prisma) {
        return transaction.user.count();
    }
}
