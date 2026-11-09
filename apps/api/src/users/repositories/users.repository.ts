import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_COUNT } from '../../common/constants/database.js';
import type { Prisma, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type CreateUserData = Pick<
    User,
    'nickname' | 'email' | 'passwordHash'
>;

export type ChangePasswordData = {
    userId: string;
    passwordHash: string;
    expectedPasswordHash: string;
    expectedAuthVersion: number;
};

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

    findAuthenticationById(
        id: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.user.findUnique({
            where: { id },
            select: {
                ...userResponseSelect,
                authVersion: true,
                emailVerifiedAt: true,
            },
        });
    }

    updatePassword(
        id: string,
        passwordHash: string,
        transaction: Prisma.TransactionClient,
    ) {
        return transaction.user.update({
            where: { id },
            data: {
                passwordHash,
                authVersion: { increment: 1 },
            },
            select: { id: true, email: true },
        });
    }

    findCurrentById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                ...userResponseSelect,
                profile: { select: { avatarPresetId: true } },
            },
        });
    }

    findPasswordById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                ...userResponseSelect,
                passwordHash: true,
                authVersion: true,
                emailVerifiedAt: true,
            },
        });
    }

    async changePasswordIfCurrent(
        { userId, passwordHash, expectedPasswordHash, expectedAuthVersion }: ChangePasswordData,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.user.updateMany({
            where: {
                id: userId,
                passwordHash: expectedPasswordHash,
                authVersion: expectedAuthVersion,
            },
            data: { passwordHash, authVersion: { increment: 1 } },
        });

        return count === SINGLE_RECORD_COUNT;
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

        return count === SINGLE_RECORD_COUNT;
    }

    count(transaction: Prisma.TransactionClient = this.prisma) {
        return transaction.user.count();
    }
}
