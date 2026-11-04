'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_ERROR_CODES } from '@ludora/security';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { APP_ROUTES } from '@/config/routes';
import { useActionErrorToast } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { FORM_VALIDATION_OPTIONS } from '@/lib/forms';
import { createPasswordResetSchema, type PasswordResetFormData } from '@/lib/schemas';

import { resetPassword } from '../actions';

const PASSWORD_RESET_SUCCESS_TOAST_ID = 'password-reset-success';

export default function usePasswordResetForm(token: string | null) {
    const locale = useLocale();
    const router = useRouter();
    const validation = useTranslations('PasswordRecovery.validation');
    const feedback = useTranslations('PasswordRecovery.reset');
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
    });
    const [isPending, startTransition] = useTransition();
    const [rejectedToken, setRejectedToken] = useState<string | null>(null);
    const requestInFlight = useRef(false);
    const requestVersion = useRef(0);

    const form = useForm<PasswordResetFormData>({
        ...FORM_VALIDATION_OPTIONS,
        resolver: zodResolver(createPasswordResetSchema(validation)),
        defaultValues: { password: '', confirmPassword: '' },
    });

    useEffect(() => {
        return () => {
            // Ignore responses from a previous token, locale, or unmounted form.
            requestVersion.current += 1;
            dismissError();
        };
    }, [dismissError, locale, token]);

    function onSubmit(data: PasswordResetFormData) {
        if (!token || requestInFlight.current) return;

        requestInFlight.current = true;
        const version = requestVersion.current;
        dismissError();

        startTransition(async () => {
            try {
                const result = await resetPassword(locale, token, data);

                if (requestVersion.current !== version) return;

                if (result.status === OPERATION_STATUS.error) {
                    if (result.error.errorCode === AUTH_ERROR_CODES.passwordResetInvalid) {
                        setRejectedToken(token);
                        form.reset();
                        return;
                    }

                    showError(result.error);
                    return;
                }

                form.reset();
                toast.success(feedback('successTitle'), {
                    id: PASSWORD_RESET_SUCCESS_TOAST_ID,
                    description: feedback('successMessage'),
                });
                router.replace(APP_ROUTES.login);
                router.refresh();
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
        hasInvalidLink: token === null || rejectedToken === token,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
