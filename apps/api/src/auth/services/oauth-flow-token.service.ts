import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import { AuthProvider } from '../../generated/prisma/client.js';
import {
    AUTH_ERRORS,
    OAUTH_FLOW_TOKEN_CONFIG,
} from '../constants/index.js';

const oauthFlowDataSchema = z.object({
    provider: z.enum(AuthProvider),
    state: z.string().min(1),
    nonce: z.string().min(1),
    codeVerifier: z.string().min(1),
});

const oauthFlowPayloadSchema = oauthFlowDataSchema.extend({
    iat: z.number().int(),
    exp: z.number().int(),
});

type OAuthFlowData = z.infer<typeof oauthFlowDataSchema>;

@Injectable()
export class OAuthFlowTokenService {
    constructor(private readonly jwtService: JwtService) { }

    async create(data: OAuthFlowData) {
        const { audience, expiresInSeconds } = OAUTH_FLOW_TOKEN_CONFIG;

        const issuedAtSeconds = Math.floor(
            Date.now() / MILLISECONDS_PER_SECOND,
        );

        const flowToken = await this.jwtService.signAsync(
            {
                ...data,
                iat: issuedAtSeconds,
            },
            {
                audience,
                expiresIn: expiresInSeconds,
            },
        );

        const expiresAt = new Date(
            (issuedAtSeconds + expiresInSeconds)
            * MILLISECONDS_PER_SECOND,
        );

        return {
            flowToken,
            expiresAt,
        };
    }

    async verify(
        token: string,
        expectedProvider: AuthProvider,
    ): Promise<OAuthFlowData> {
        const { audience } = OAUTH_FLOW_TOKEN_CONFIG;
        const { message, errorCode } = AUTH_ERRORS.oauthFlowInvalid;

        let payload: unknown;

        try {
            payload = await this.jwtService.verifyAsync(token, {
                audience,
            });
        } catch {
            throw new BadRequestException(message, { errorCode });
        }

        const validation = oauthFlowPayloadSchema.safeParse(payload);

        if (
            !validation.success
            || validation.data.provider !== expectedProvider
        ) {
            throw new BadRequestException(message, { errorCode });
        }

        return validation.data;
    }
}