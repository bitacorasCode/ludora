'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { useActionErrorToast } from '@/hooks';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { FORM_VALIDATION_OPTIONS } from '@/lib/forms';
import {
    createRecoveryRequestSchema,
    type RecoveryRequestFormData,
} from '@/lib/schemas';

import { requestPasswordRecovery } from '../actions';

export default function useRecoveryRequestForm() {
    const locale = useLocale();
    const validation = useTranslations('PasswordRecovery.validation');
    const feedback = useTranslations('PasswordRecovery.request');

    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
    });

    const [isPending, startTransition] = useTransition();
    const [isRequestAccepted, setIsRequestAccepted] = useState(false);

    const requestInFlight = useRef(false);
    const requestVersion = useRef(0);

    const form = useForm<RecoveryRequestFormData>({
        ...FORM_VALIDATION_OPTIONS,
        resolver: zodResolver(createRecoveryRequestSchema(validation)),
        defaultValues: { email: '' },
    });

    useEffect(() => {
        return () => {
            // Ignore responses from a previous locale or an unmounted form.
            requestVersion.current += 1;
            dismissError();
        };
    }, [dismissError, locale]);

    function clearConfirmation() {
        setIsRequestAccepted(false);
    }

    function onSubmit(data: RecoveryRequestFormData) {
        if (requestInFlight.current) return;

        requestInFlight.current = true;
        const version = requestVersion.current;
        dismissError();
        clearConfirmation();

        startTransition(async () => {
            try {
                const result = await requestPasswordRecovery(locale, data);

                if (requestVersion.current !== version) return;

                if (result.status === OPERATION_STATUS.error) {
                    showError(result.error);
                    return;
                }

                setIsRequestAccepted(true);
            } catch {
                if (requestVersion.current !== version) return;

                showError({ errorCode: ACTION_ERROR_CODES.unexpected });
            } finally {
                requestInFlight.current = false;
            }
        });
    }

    return {
        form,
        onSubmit,
        clearConfirmation,
        isRequestAccepted,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
