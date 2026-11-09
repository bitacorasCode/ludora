import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ClientIpModule } from '../common/client-ip.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { ProfileRepository } from './repositories/profile.repository.js';

@Module({
    imports: [
        AuthModule,
        ClientIpModule,
        PrismaModule,
    ],
    controllers: [ProfileController],
    providers: [
        ProfileRepository,
        ProfileService,
    ],
})
export class ProfileModule { }