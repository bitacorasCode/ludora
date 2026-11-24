import { normalizeEmail, normalizeNickname } from '@ludora/contracts/auth';
import { Injectable } from '@nestjs/common';

import type { Prisma, User } from '../generated/prisma/client.js';
import { type ChangePasswordData, type CreateUserData, UsersRepository } from './repositories/index.js';

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) { }

    create(
        data: CreateUserData,
        transaction?: Prisma.TransactionClient,
    ) {
        return this.usersRepository.create(
            {
                nickname: normalizeNickname(data.nickname),
                email: normalizeEmail(data.email),
                passwordHash: data.passwordHash,
            },
            transaction,
        );
    }

    findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findByEmail(normalizeEmail(email));
    }

    findById(id: string) {
        return this.usersRepository.findById(id);
    }

    findIdByEmail(email: string, transaction?: Prisma.TransactionClient) {
        return this.usersRepository.findIdByEmail(
            normalizeEmail(email),
            transaction,
        );
    }

    findCurrentById(id: string) {
        return this.usersRepository.findCurrentById(id);
    }

    findPasswordById(id: string) {
        return this.usersRepository.findPasswordById(id);
    }

    changePasswordIfCurrent(
        data: ChangePasswordData,
        transaction: Prisma.TransactionClient,
    ) {
        return this.usersRepository.changePasswordIfCurrent(data, transaction);
    }

    findAuthenticationById(
        id: string,
        transaction?: Prisma.TransactionClient,
    ) {
        return this.usersRepository.findAuthenticationById(id, transaction);
    }

    updatePassword(
        id: string,
        passwordHash: string,
        transaction: Prisma.TransactionClient,
    ) {
        return this.usersRepository.updatePassword(id, passwordHash, transaction);
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
}
