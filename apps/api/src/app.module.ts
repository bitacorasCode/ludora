import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RATE_LIMIT_CONFIG } from './config/rate-limit.js';
import { ProfileModule } from './profile/profile.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        }),
        ThrottlerModule.forRoot([RATE_LIMIT_CONFIG]),
        UsersModule,
        AuthModule,
        ProfileModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
