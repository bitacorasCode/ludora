import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import type { ApiErrorDefinition } from '../../common/types/api-error-definition.js';
import { AuthProvider } from '../../generated/prisma/client.js';
import {
    AUTH_ERRORS,
    OAUTH_FLOW_TOKEN_CONFIG,
    OAUTH_REGISTRATION_TOKEN_CONFIG,
} from '../constants/index.js';
import {
    type ExternalIdentity,
    externalIdentitySchema,
} from '../schemas/external-identity.schema.js';

const oauthFlowDataSchema = z.object({
    provider: z.enum(AuthProvider),
    state: z.string().min(1),
    nonce: z.string().min(1),
    codeVerifier: z.string().min(1),
});

const tokenTimestampFields = {
    iat: z.number().int(),
    exp: z.number().int(),
};

const oauthFlowPayloadSchema = oauthFlowDataSchema.extend(tokenTimestampFields);
const oauthRegistrationPayloadSchema = externalIdentitySchema.extend(
    tokenTimestampFields,
);

type OAuthFlowData = z.infer<typeof oauthFlowDataSchema>;

@Injectable()
export class OAuthFlowTokenService {
    constructor(private readonly jwtService: JwtService) { }

    async create(data: OAuthFlowData) {
        const { token: flowToken, expiresAt } = await this.signPayload(
            oauthFlowDataSchema.parse(data),
            OAUTH_FLOW_TOKEN_CONFIG,
        );

        return {
            flowToken,
            expiresAt,
        };
    }

    async createRegistration(identity: ExternalIdentity) {
        const { token: registrationToken, expiresAt } = await this.signPayload(
            externalIdentitySchema.parse(identity),
            OAUTH_REGISTRATION_TOKEN_CONFIG,
        );

        return { registrationToken, expiresAt };
    }

    async verify(
        token: string,
        expectedProvider: AuthProvider,
    ): Promise<OAuthFlowData> {
        const { audience } = OAUTH_FLOW_TOKEN_CONFIG;
        const { message, errorCode } = AUTH_ERRORS.oauthFlowInvalid;

        const payload = await this.verifyPayload(
            token,
            audience,
            AUTH_ERRORS.oauthFlowInvalid,
        );

        const validation = oauthFlowPayloadSchema.safeParse(payload);

        if (
            !validation.success
            || validation.data.provider !== expectedProvider
        ) {
            throw new BadRequestException(message, { errorCode });
        }

        return validation.data;
    }

    async verifyRegistration(token: string) {
        const { audience } = OAUTH_REGISTRATION_TOKEN_CONFIG;
        const error = AUTH_ERRORS.oauthRegistrationInvalid;
        const payload = await this.verifyPayload(token, audience, error);
        const validation = oauthRegistrationPayloadSchema.safeParse(payload);

        if (!validation.success) {
            const { message, errorCode } = error;

            throw new BadRequestException(message, { errorCode });
        }

        return validation.data;
    }

    private async verifyPayload(
        token: string,
        audience: string,
        { message, errorCode }: ApiErrorDefinition,
    ): Promise<unknown> {
        try {
            return await this.jwtService.verifyAsync(token, { audience });
        } catch {
            throw new BadRequestException(message, { errorCode });
        }
    }

    private async signPayload(
        payload: Record<string, unknown>,
        { audience, expiresInSeconds }: {
            audience: string;
            expiresInSeconds: number;
        },
    ) {
        const issuedAtSeconds = Math.floor(
            Date.now() / MILLISECONDS_PER_SECOND,
        );

        const token = await this.jwtService.signAsync(
            { ...payload, iat: issuedAtSeconds },
            { audience, expiresIn: expiresInSeconds },
        );

        const expiresAt = new Date(
            (issuedAtSeconds + expiresInSeconds) * MILLISECONDS_PER_SECOND,
        );

        return { token, expiresAt };
    }
}
