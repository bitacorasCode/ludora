'use client';

import { AUTH_ERROR_CODES } from '@ludora/security';
import { useCallback } from 'react';

import { useSessionRecovery } from '@/components/auth';
import {
    type ActionResult,
    isAuthenticationError,
    OPERATION_STATUS,
} from '@/lib/actions';
import { HTTP_STATUS } from '@/lib/api/constants';
import { SESSION_REFRESH_OUTCOME } from '@/lib/session/refresh-result';

import { useRequestScope } from './use-request-scope';

type ProtectedRequestOptions = {
    signal?: AbortSignal;
};

const SESSION_REJECTION_CODES: ReadonlySet<string> = new Set([
    AUTH_ERROR_CODES.authenticationRequired,
    AUTH_ERROR_CODES.invalidToken,
    AUTH_ERROR_CODES.invalidTokenPayload,
]);

export function useProtectedRequest() {
    const { recoverSession, isRecoveringSession } =
        useSessionRecovery();

    const { capture } = useRequestScope();

    const execute = useCallback(
        async <TData>(
            operation: () => Promise<ActionResult<TData>>,
            { signal }: ProtectedRequestOptions = {},
        ): Promise<ActionResult<TData> | null> => {
            const isCurrent = capture();

            function isInterrupted() {
                return (
                    !isCurrent()
                    || signal?.aborted === true
                );
            }

            async function runOperation() {
                if (isInterrupted()) return null;

                try {
                    const result = await operation();

                    return isInterrupted() ? null : result;
                } catch (error) {
                    if (isInterrupted()) return null;

                    throw error;
                }
            }

            const result = await runOperation();

            if (
                result?.status !== OPERATION_STATUS.error
                || !isAuthenticationError(result.error)
            ) {
                return result;
            }

            const recovery = await recoverSession();

            if (isInterrupted()) return null;

            if (recovery.status === OPERATION_STATUS.error) {
                return recovery;
            }

            if (recovery.data === SESSION_REFRESH_OUTCOME.ended) return null;

            // Only repeat operations that were explicitly rejected by authentication.
            const { errorCode, statusCode } = result.error;
            const canRetry = (statusCode === undefined || statusCode === HTTP_STATUS.unauthorized)
                && SESSION_REJECTION_CODES.has(errorCode);

            return canRetry ? runOperation() : result;
        },
        [capture, recoverSession],
    );

    return { execute, isRecoveringSession };
}
