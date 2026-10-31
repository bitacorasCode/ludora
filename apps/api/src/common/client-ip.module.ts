import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClientIpService } from './services/client-ip.service.js';
import { InternalRequestService } from './services/internal-request.service.js';

@Module({
    imports: [ConfigModule],
    providers: [InternalRequestService, ClientIpService],
    exports: [ClientIpService],
})
export class ClientIpModule { }
