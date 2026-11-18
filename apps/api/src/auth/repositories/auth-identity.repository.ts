import { Injectable } from '@nestjs/common';

import type {
    AuthIdentity,
    AuthProvider,
    Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type CreateAuthIdentityData = Pick<
    AuthIdentity,
    'userId' | 'provider' | 'providerUserId'
>;

@Injectable()
export class AuthIdentityRepository {
    constructor(private readonly prisma: PrismaService) { }

    findByProviderUserId(
        provider: AuthProvider,
        providerUserId: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.authIdentity.findUnique({
            where: {
                provider_providerUserId: {
                    provider,
                    providerUserId,
                },
            },
            select: {
                userId: true,
            },
        });
    }

    create(
        {
            userId,
            provider,
            providerUserId,
        }: CreateAuthIdentityData,
        transaction: Prisma.TransactionClient,
    ) {
        return transaction.authIdentity.create({
            data: {
                userId,
                provider,
                providerUserId,
            },
            select: {
                id: true,
                userId: true,
            },
        });
    }
}