import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { InternalRequestService } from './services/internal-request.service.js';

@Module({
    imports: [ConfigModule],
    providers: [InternalRequestService],
    exports: [InternalRequestService],
})
export class InternalRequestModule {}
