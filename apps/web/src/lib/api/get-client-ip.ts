import 'server-only';

import { isValidIp } from '@ludora/security/server';
import { headers } from 'next/headers';

import { ENV_ENABLED_FLAG, NODE_ENVIRONMENT } from '@/config/environment';

import { VERCEL_REQUEST_HEADERS } from './constants';

export async function getClientIp(): Promise<string | undefined> {
    const { NODE_ENV, VERCEL } = process.env;

    if (NODE_ENV !== NODE_ENVIRONMENT.production || VERCEL !== ENV_ENABLED_FLAG) {
        return undefined;
    }

    const requestHeaders = await headers();

    const clientIp = requestHeaders
        .get(VERCEL_REQUEST_HEADERS.clientIp)
        ?.trim();

    if (!clientIp || !isValidIp(clientIp)) {
        return undefined;
    }

    return clientIp;
}
