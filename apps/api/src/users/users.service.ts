import { Injectable } from '@nestjs/common';

import type { Prisma, User } from '../generated/prisma/client.js';
import { type CreateUserData, UsersRepository } from './repositories/index.js';

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) { }

    create(
        data: CreateUserData,
        transaction?: Prisma.TransactionClient,
    ) {
        return this.usersRepository.create(
            {
                nickname: data.nickname.trim(),
                email: data.email.trim().toLowerCase(),
                passwordHash: data.passwordHash,
            },
            transaction,
        );
    }

    findByEmail(email: string): Promise<User | null> {
        const normalizedEmail = email.trim().toLowerCase();

        return this.usersRepository.findByEmail(normalizedEmail);
    }

    findById(id: string) {
        return this.usersRepository.findById(id);
    }

    markEmailVerifiedIfPending(
        id: string,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        return this.usersRepository.markEmailVerifiedIfPending(
            id,
            new Date(),
            transaction,
        );
    }

    count() {
        return this.usersRepository.count();
    }
}
