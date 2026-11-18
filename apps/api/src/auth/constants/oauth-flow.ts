import { SECONDS_PER_MINUTE } from '../../common/constants/index.js';

export const OAUTH_FLOW_TOKEN_CONFIG = {
    audience: 'ludora-oauth-flow',
    expiresInSeconds: 10 * SECONDS_PER_MINUTE,
} as const;