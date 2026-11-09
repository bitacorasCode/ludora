import {
    Body,
    Controller,
    Get,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import {
    type SaveProfileDto,
    saveProfileSchema,
} from './dto/save-profile.dto.js';
import { ProfileService } from './profile.service.js';

@Controller('profile')
@UseGuards(RateLimitGuard, JwtAuthGuard)
export class ProfileController {
    constructor(
        private readonly profileService: ProfileService,
    ) { }

    @Get()
    getProfile(
        @Req() { auth: { userId } }: AuthenticatedRequest,
    ) {
        return this.profileService.getByUserId(userId);
    }

    @Put()
    saveProfile(
        @Req() { auth: { userId } }: AuthenticatedRequest,
        @Body({ schema: saveProfileSchema }) data: SaveProfileDto,
    ) {
        return this.profileService.save(userId, data);
    }
}