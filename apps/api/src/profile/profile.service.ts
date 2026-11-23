import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AUTH_ERRORS } from '../auth/constants/auth-errors.js';
import type { SaveProfileDto } from './dto/save-profile.dto.js';
import { ProfileRepository } from './repositories/profile.repository.js';

@Injectable()
export class ProfileService {
    constructor(
        private readonly profileRepository: ProfileRepository,
    ) { }

    async getByUserId(userId: string) {
        const profile = await this.profileRepository.findByUserId(userId);

        return profile ?? {
            userId,
            avatarPresetId: null,
            bio: null,
        };
    }

    save(
        userId: string,
        { expectedUserId, avatarPresetId, bio }: SaveProfileDto,
    ) {
        if (expectedUserId !== undefined && expectedUserId !== userId) {
            const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

            throw new UnauthorizedException(message, { errorCode });
        }

        return this.profileRepository.save(userId, {
            avatarPresetId,
            bio: bio?.trim() || null,
        });
    }
}
