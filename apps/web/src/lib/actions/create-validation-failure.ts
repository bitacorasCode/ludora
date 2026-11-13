import { ACTION_ERROR_CODES, OPERATION_STATUS } from './constants';
import type { ActionResult } from './types';

export function createValidationFailure(
  issues: readonly { message: string }[],
): ActionResult<never> {
  return {
    status: OPERATION_STATUS.error,
    error: {
      errorCode: ACTION_ERROR_CODES.validationFailed,
      validationErrors: issues.map(({ message }) => message),
    },
  };
}
