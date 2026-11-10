'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_ERROR_CODES } from '@ludora/security';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useLayoutEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useActionErrorToast, useProtectedRequest } from '@/hooks';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { FORM_ERROR_TYPES, FORM_VALIDATION_OPTIONS } from '@/lib/forms';

import { changePassword } from '../actions';
import { type ChangePasswordFormData, createChangePasswordSchema } from '../schema';

const PASSWORD_CHANGED_TOAST_ID = 'password-changed';

export function useChangePasswordForm(userId: string, onSuccess: () => void) {
    const locale = useLocale();
    const router = useRouter();

    const validation = useTranslations('UserSettings.password.validation');
    const feedback = useTranslations('UserSettings.password.form');
    const errors = useTranslations('UserSettings.password.errors');

    const { execute, isRecoveringSession } = useProtectedRequest();
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
        featureErrors: errors,
    });

    const requestInFlight = useRef(false);
    const isActive = useRef(false);

    const form = useForm<ChangePasswordFormData>({
        ...FORM_VALIDATION_OPTIONS,
        resolver: zodResolver(createChangePasswordSchema(validation)),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    });

    useLayoutEffect(() => {
        isActive.current = true;

        return () => {
            isActive.current = false;
            form.reset();
            dismissError();
        };
    }, [form, dismissError]);

    async function onSubmit(values: ChangePasswordFormData) {
        if (requestInFlight.current) return;

        requestInFlight.current = true;
        dismissError();

        try {
            const result = await execute(() => changePassword(locale, userId, values));

            if (!result || !isActive.current) return;

            if (result.status === OPERATION_STATUS.error) {
                if (result.error.errorCode === AUTH_ERROR_CODES.currentPasswordInvalid) {
                    form.setError('currentPassword', {
                        type: FORM_ERROR_TYPES.server,
                        message: errors('AUTH_CURRENT_PASSWORD_INVALID'),
                    }, { shouldFocus: true });
                    return;
                }

                if (result.error.errorCode === AUTH_ERROR_CODES.passwordUnchanged) {
                    form.setError('newPassword', {
                        type: FORM_ERROR_TYPES.server,
                        message: errors('AUTH_PASSWORD_UNCHANGED'),
                    }, { shouldFocus: true });
                    return;
                }

                showError(result.error);
                return;
            }

            form.reset();
            toast.success(feedback('success'), { id: PASSWORD_CHANGED_TOAST_ID });
            onSuccess();
            router.refresh();
        } catch {
            if (isActive.current) showError({ errorCode: ACTION_ERROR_CODES.unexpected });
        } finally {
            requestInFlight.current = false;
        }
    }

    return {
        form,
        onSubmit,
        dismissError,
        isSubmitting: form.formState.isSubmitting || isRecoveringSession,
    };
}
