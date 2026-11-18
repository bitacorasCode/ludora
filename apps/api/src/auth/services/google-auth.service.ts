import {
    BadRequestException,
    HttpStatus,
    Inject,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import * as oidc from 'openid-client';
import { z } from 'zod';

import { AuthProvider } from '../../generated/prisma/client.js';
import {
    GOOGLE_OAUTH,
    googleAuthConfig,
} from '../config/google-auth.config.js';
import { AUTH_ERRORS } from '../constants/index.js';
import { emailSchema } from '../schemas/email.schema.js';
import { OAuthFlowTokenService } from './oauth-flow-token.service.js';

const googleIdentitySchema = z.object({
    sub: z.string().min(1),
    email: emailSchema.optional(),
    email_verified: z.boolean().optional(),
});

@Injectable()
export class GoogleAuthService {
    private clientConfiguration?: Promise<oidc.Configuration>;

    constructor(
        @Inject(googleAuthConfig.KEY)
        private readonly settings: ConfigType<typeof googleAuthConfig>,
        private readonly flowTokenService: OAuthFlowTokenService,
    ) { }

    async createAuthorizationRequest() {
        const configuration = await this.getClientConfiguration();
        const { scope, codeChallengeMethod } = GOOGLE_OAUTH;
        const { redirectUri } = this.settings;

        const state = oidc.randomState();
        const nonce = oidc.randomNonce();
        const codeVerifier = oidc.randomPKCECodeVerifier();
        const codeChallenge =
            await oidc.calculatePKCECodeChallenge(codeVerifier);

        const authorizationUrl = oidc.buildAuthorizationUrl(
            configuration,
            {
                redirect_uri: redirectUri,
                scope,
                state,
                nonce,
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod,
            },
        );

        const flow = await this.flowTokenService.create({
            provider: AuthProvider.GOOGLE,
            state,
            nonce,
            codeVerifier,
        });

        return {
            authorizationUrl: authorizationUrl.href,
            ...flow,
        };
    }

    private getClientConfiguration(): Promise<oidc.Configuration> {
        if (!this.clientConfiguration) {
            const { clientId, clientSecret } = this.settings;
            const { issuer, requestTimeoutSeconds } = GOOGLE_OAUTH;

            this.clientConfiguration = oidc.discovery(
                new URL(issuer),
                clientId,
                clientSecret,
                undefined,
                {
                    timeout: requestTimeoutSeconds,
                    execute: [oidc.enableNonRepudiationChecks],
                },
            ).catch(() => {
                this.clientConfiguration = undefined;

                const { message, errorCode } = AUTH_ERRORS.oauthUnavailable;

                throw new ServiceUnavailableException(message, { errorCode });
            });
        }

        return this.clientConfiguration;
    }

    async verifyAuthorization(
        flowToken: string,
        responseParameters: string,
    ) {
        const flow = await this.flowTokenService.verify(
            flowToken,
            AuthProvider.GOOGLE,
        );

        const configuration = await this.getClientConfiguration();

        const callbackUrl = new URL(this.settings.redirectUri);
        callbackUrl.search = responseParameters;

        let claims: unknown;

        try {
            const tokens = await oidc.authorizationCodeGrant(
                configuration,
                callbackUrl,
                {
                    expectedState: flow.state,
                    expectedNonce: flow.nonce,
                    pkceCodeVerifier: flow.codeVerifier,
                },
            );

            claims = tokens.claims();
        } catch (error) {
            const isRejectedAuthorization =
                error instanceof oidc.AuthorizationResponseError
                || error instanceof oidc.ClientError
                || (
                    error instanceof oidc.ResponseBodyError
                    && error.status < HttpStatus.INTERNAL_SERVER_ERROR
                );

            if (isRejectedAuthorization) {
                const { message, errorCode } =
                    AUTH_ERRORS.oauthAuthenticationFailed;

                throw new BadRequestException(message, { errorCode });
            }

            const { message, errorCode } = AUTH_ERRORS.oauthUnavailable;

            throw new ServiceUnavailableException(message, { errorCode });
        }

        const validation = googleIdentitySchema.safeParse(claims);

        if (!validation.success) {
            const { message, errorCode } =
                AUTH_ERRORS.oauthAuthenticationFailed;

            throw new BadRequestException(message, { errorCode });
        }

        const {
            sub,
            email,
            email_verified: emailVerified,
        } = validation.data;

        return {
            provider: AuthProvider.GOOGLE,
            providerUserId: sub,
            email: email ?? null,
            emailVerified: emailVerified === true,
        };
    }
}