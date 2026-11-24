import type { z } from 'zod';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';

import { API_ERROR_CODES } from './constants';

export function parseApiResponse<TData>(
    result: ActionResult<unknown>,
    schema: z.ZodType<TData>,
): ActionResult<TData> {
    if (result.status === OPERATION_STATUS.error) return result;

    const parsed = schema.safeParse(result.data);

    if (!parsed.success) {
        return {
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.invalidResponse },
        };
    }

    return { status: OPERATION_STATUS.success, data: parsed.data };
}
