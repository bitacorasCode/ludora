'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useActionErrorToast } from '@/hooks';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { FORM_VALIDATION_OPTIONS } from '@/lib/forms';
import {
    createRecoveryRequestSchema,
    type RecoveryRequestFormData,
} from '@/lib/schemas';

import { requestPasswordRecovery } from '../actions';

const RECOVERY_REQUEST_SUCCESS_TOAST_ID = 'recovery-request-success';

export default function useRecoveryRequestForm() {
    const locale = useLocale();
    const validation = useTranslations('PasswordRecovery.validation');
    const feedback = useTranslations('PasswordRecovery.request');

    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
    });

    const [isPending, startTransition] = useTransition();

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
            toast.dismiss(RECOVERY_REQUEST_SUCCESS_TOAST_ID);
        };
    }, [dismissError, locale]);

    function onSubmit(data: RecoveryRequestFormData) {
        if (requestInFlight.current) return;

        requestInFlight.current = true;
        const version = requestVersion.current;
        dismissError();
        toast.dismiss(RECOVERY_REQUEST_SUCCESS_TOAST_ID);

        startTransition(async () => {
            try {
                const result = await requestPasswordRecovery(locale, data);

                if (requestVersion.current !== version) return;

                if (result.status === OPERATION_STATUS.error) {
                    showError(result.error);
                    return;
                }

                toast.success(feedback('successTitle'), {
                    id: RECOVERY_REQUEST_SUCCESS_TOAST_ID,
                    description: feedback('successMessage'),
                });
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
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
