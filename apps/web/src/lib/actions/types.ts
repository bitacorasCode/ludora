import type { OPERATION_STATUS } from './constants';

export type ActionError = {
    errorCode: string;
    statusCode?: number;
    validationErrors?: string[];
};

export type ActionResult<TData = null> =
    | {
        status: typeof OPERATION_STATUS.success;
        data: TData;
    }
    | {
        status: typeof OPERATION_STATUS.error;
        error: ActionError;
    };