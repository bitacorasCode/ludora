'use client';

import { useCallback } from 'react';

import { useSessionRecovery } from '@/components/auth';
import {
    type ActionResult,
    isAuthenticationError,
    OPERATION_STATUS,
} from '@/lib/actions';

import { useRequestScope } from './use-request-scope';

type ProtectedRequestOptions = {
    signal?: AbortSignal;
    retryAfterRecovery?: boolean;
};

export function useProtectedRequest() {
    const { recoverSession, isRecoveringSession } =
        useSessionRecovery();

    const { capture } = useRequestScope();

    const execute = useCallback(
        async <TData>(
            operation: () => Promise<ActionResult<TData>>,
            {
                signal,
                retryAfterRecovery = false,
            }: ProtectedRequestOptions = {},
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

            if (!result) return null;

            const requiresRecovery =
                result.status === OPERATION_STATUS.error
                && isAuthenticationError(result.error);

            if (!requiresRecovery) {
                return result;
            }

            await recoverSession();

            if (isInterrupted()) return null;

            if (retryAfterRecovery) {
                return runOperation();
            }

            return null;
        },
        [capture, recoverSession],
    );

    return { execute, isRecoveringSession };
}
