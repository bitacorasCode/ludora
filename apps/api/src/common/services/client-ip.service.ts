import { isValidIp } from '@ludora/security/server';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { RENDER_CLIENT_IP_CONFIG } from '../../config/client-ip.js';
import { InternalRequestService } from './internal-request.service.js';

const { enabledValue, webServiceType, headerName } =
    RENDER_CLIENT_IP_CONFIG;

@Injectable()
export class ClientIpService {
    constructor(
        private readonly internalRequestService: InternalRequestService,
        private readonly config: ConfigService,
    ) { }

    getClientIp(request: Request): string | undefined {
        const forwardedIp =
            this.internalRequestService.getForwardedClientIp(request);

        if (forwardedIp) {
            return forwardedIp;
        }

        const isRender =
            this.config.get<string>('RENDER') === enabledValue;

        const serviceType =
            this.config.get<string>('RENDER_SERVICE_TYPE');

        if (isRender && serviceType !== webServiceType) {
            return undefined;
        }

        const receivedIp = isRender
            ? request.headers[headerName]
            : request.socket.remoteAddress;

        if (typeof receivedIp !== 'string') {
            return undefined;
        }

        const clientIp = receivedIp.trim();

        if (!isValidIp(clientIp)) {
            return undefined;
        }

        return clientIp;
    }
}