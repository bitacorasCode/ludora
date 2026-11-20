import { Injectable } from '@nestjs/common';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/index.js';
import { PASSWORD_RESET_CONFIG } from '../constants/index.js';
import { createOpaqueToken, hashOpaqueToken } from '../utils/opaque-token.js';

@Injectable()
export class PasswordResetTokenService {
    create() {
        const { expiresInSeconds } = PASSWORD_RESET_CONFIG;
        const credentials = createOpaqueToken();
        const expiresAt = new Date(
            Date.now() + expiresInSeconds * MILLISECONDS_PER_SECOND,
        );

        return {
            ...credentials,
            expiresAt,
        };
    }

    hash(token: string): string {
        return hashOpaqueToken(token);
    }
}
