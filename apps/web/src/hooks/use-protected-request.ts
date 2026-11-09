'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import { useSessionRecovery } from '@/components/auth';
import {
    type ActionResult,
    isAuthenticationError,
    OPERATION_STATUS,
} from '@/lib/actions';

type ProtectedRequestOptions = {
    signal?: AbortSignal;
    retryAfterRecovery?: boolean;
};

export function useProtectedRequest() {
    const { recoverSession, isRecoveringSession } =
        useSessionRecovery();

    const lifecycle = useRef({
        active: false,
        generation: 0,
    });

    useLayoutEffect(() => {
        const current = lifecycle.current;

        current.active = true;
        current.generation += 1;

        return () => {
            current.active = false;
            current.generation += 1;
        };
    }, []);

    const execute = useCallback(
        async <TData>(
            operation: () => Promise<ActionResult<TData>>,
            {
                signal,
                retryAfterRecovery = false,
            }: ProtectedRequestOptions = {},
        ): Promise<ActionResult<TData> | null> => {
            const generation = lifecycle.current.generation;

            function isInterrupted() {
                return (
                    !lifecycle.current.active
                    || lifecycle.current.generation !== generation
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
        [recoverSession],
    );

    return { execute, isRecoveringSession };
}