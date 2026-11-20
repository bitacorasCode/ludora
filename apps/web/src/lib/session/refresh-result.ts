import type { ActionResult } from '@/lib/actions';

export const SESSION_REFRESH_OUTCOME = {
    active: 'active',
    ended: 'ended',
    renewed: 'renewed',
} as const;

export type RefreshSessionResult = ActionResult<
    (typeof SESSION_REFRESH_OUTCOME)[keyof typeof SESSION_REFRESH_OUTCOME]
>;
