'use client';

import { useTranslations } from 'next-intl';

import type { ActionError } from '@/lib/actions';

type ErrorTranslator = {
    (key: string): string;
    has: (key: string) => boolean;
};

export function useActionErrorMessage(
    error: ActionError | null,
    featureErrors?: ErrorTranslator,
): string | null {
    const commonErrors = useTranslations('Common.errors');

    if (!error) {
        return null;
    }

    const { errorCode, validationErrors } = error;
    const [validationMessage] = validationErrors ?? [];

    if (validationMessage) {
        return validationMessage;
    }

    if (featureErrors?.has(errorCode)) {
        return featureErrors(errorCode);
    }

    if (commonErrors.has(errorCode)) {
        return commonErrors(errorCode);
    }

    return commonErrors('unknown');
}