import { Injectable } from '@nestjs/common';

import {
    ProfileRepository,
    type SaveProfileData,
} from './repositories/profile.repository.js';

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
        { avatarPresetId, bio }: SaveProfileData,
    ) {
        return this.profileRepository.save(userId, {
            avatarPresetId,
            bio: bio?.trim() || null,
        });
    }
}