'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { useActionErrorToast } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import {
    ACTION_ERROR_CODES,
    OPERATION_STATUS,
} from '@/lib/actions';
import { createLoginSchema, type LoginFormData } from '@/lib/schemas';

import { type LoginResult, loginUser } from '../actions';
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
    const requestInFlight = useRef(false);
    const isActive = useRef(false);

    useEffect(() => {
        isActive.current = true;

        return () => {
            isActive.current = false;
        };
    }, []);

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
        if (requestInFlight.current) {
            return;
        }

        requestInFlight.current = true;
        dismissError();

        startTransition(async () => {
            let result: LoginResult;

            try {
                result = await loginUser(locale, data);
            } catch {
                if (!isActive.current) return;

                clearCredentialsError();
                showError({
                    errorCode: ACTION_ERROR_CODES.unexpected,
                });
                return;
            } finally {
                requestInFlight.current = false;
            }

            if (!isActive.current) return;

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

            if (result.data !== null) {
                const { verificationId, resendAvailableAt } = result.data;

                router.replace({
                    pathname: '/verify-email',
                    query: { verificationId, resendAvailableAt },
                });
                return;
            }

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
