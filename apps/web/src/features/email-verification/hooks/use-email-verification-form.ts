'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { useActionErrorToast } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import {
    createEmailVerificationSchema,
    type EmailVerificationFormData,
} from '@/lib/schemas';

import { verifyEmail } from '../actions';
import { EMAIL_VERIFICATION_ERROR_CODES } from '../config';

export default function useEmailVerificationForm(verificationId: string) {
    const locale = useLocale();
    const validation = useTranslations('EmailVerification.validation');
    const errors = useTranslations('EmailVerification.errors');
    const feedback = useTranslations('EmailVerification.feedback');
    const router = useRouter();
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
        featureErrors: errors,
    });
    const [isPending, startTransition] = useTransition();

    const form = useForm<EmailVerificationFormData>({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: zodResolver(createEmailVerificationSchema(validation)),
        defaultValues: {
            verificationId,
            code: '',
        },
    });
    const { getFieldState, setFocus } = form;

    useEffect(() => {
        if (!isPending && getFieldState('code').error?.type === 'server') {
            setFocus('code');
        }
    }, [getFieldState, isPending, setFocus]);

    function onSubmit(data: EmailVerificationFormData) {
        if (isPending) {
            return;
        }

        dismissError();

        startTransition(async () => {
            let result: ActionResult;

            try {
                result = await verifyEmail(locale, {
                    ...data,
                    verificationId,
                });
            } catch {
                showError({
                    errorCode: ACTION_ERROR_CODES.unexpected,
                });
                return;
            }

            if (result.status === OPERATION_STATUS.error) {
                const { errorCode } = result.error;

                if (errorCode === EMAIL_VERIFICATION_ERROR_CODES.codeInvalid) {
                    form.setError('code', {
                        type: 'server',
                        message: errors(errorCode),
                    });
                    return;
                }

                showError(result.error);
                return;
            }

            form.reset();
            router.replace('/account/profile');
            router.refresh();
        });
    }

    return {
        form,
        onSubmit,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
