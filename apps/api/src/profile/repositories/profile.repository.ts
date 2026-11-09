import { Injectable } from '@nestjs/common';

import type { Prisma, UserProfile } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type SaveProfileData = Pick<
    UserProfile,
    'avatarPresetId' | 'bio'
>;

const profileResponseSelect = {
    userId: true,
    avatarPresetId: true,
    bio: true,
} satisfies Prisma.UserProfileSelect;

@Injectable()
export class ProfileRepository {
    constructor(private readonly prisma: PrismaService) { }

    findByUserId(
        userId: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.userProfile.findUnique({
            where: { userId },
            select: profileResponseSelect,
        });
    }

    save(
        userId: string,
        { avatarPresetId, bio }: SaveProfileData,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        const data = { avatarPresetId, bio };

        return transaction.userProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
            select: profileResponseSelect,
        });
    }
}