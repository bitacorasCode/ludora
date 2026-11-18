import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClientIpService, InternalRequestService } from './services/index.js';

@Module({
    imports: [ConfigModule],
    providers: [InternalRequestService, ClientIpService],
    exports: [ClientIpService, InternalRequestService],
})
export class ClientIpModule { }
