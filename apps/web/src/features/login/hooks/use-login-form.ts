'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { useActionErrorToast } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { createLoginSchema, type LoginFormData } from '@/lib/schemas';

import { loginUser } from '../actions';
import { LOGIN_ERROR_CODES } from '../config';

export default function useLoginForm() {
    const locale = useLocale();
    const router = useRouter();
    const validation = useTranslations('Login.validation');
    const feedback = useTranslations('Login.feedback');
    const errors = useTranslations('Login.errors');
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
        featureErrors: errors,
    });

    const [isPending, startTransition] = useTransition();
    const [hasInvalidCredentials, setHasInvalidCredentials] = useState(false);

    const form = useForm<LoginFormData>({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: zodResolver(createLoginSchema(validation)),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    function clearCredentialsError() {
        setHasInvalidCredentials(false);
    }

    function onSubmit(data: LoginFormData) {
        if (isPending) {
            return;
        }

        dismissError();

        startTransition(async () => {
            let result: ActionResult;

            try {
                result = await loginUser(locale, data);
            } catch {
                clearCredentialsError();
                showError({
                    errorCode: ACTION_ERROR_CODES.unexpected,
                });
                return;
            }

            if (result.status === OPERATION_STATUS.error) {
                if (result.error.errorCode === LOGIN_ERROR_CODES.invalidCredentials) {
                    setHasInvalidCredentials(true);
                    return;
                }

                clearCredentialsError();
                showError(result.error);
                return;
            }

            clearCredentialsError();
            form.reset();
            router.replace('/');
            router.refresh();
        });
    }

    return {
        form,
        onSubmit,
        hasInvalidCredentials,
        clearCredentialsError,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
