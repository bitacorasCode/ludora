'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { APP_ROUTES } from '@/config/routes';
import {
    EMAIL_VERIFICATION_DELIVERY,
    EMAIL_VERIFICATION_QUERY_PARAMS,
} from '@/features/email-verification/config';
import { useActionErrorToast, useRequestScope } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import {
    isUnconfirmedApiOutcome,
    OPERATION_STATUS,
} from '@/lib/actions';
import { FORM_ERROR_TYPES, FORM_VALIDATION_OPTIONS } from '@/lib/forms';
import {
    createRegisterSchema,
    type RegisterFormData,
} from '@/lib/schemas';

import { type RegisterResult, registerUser } from '../actions';
import { REGISTER_FIELD_ERRORS, userDefaultValues } from '../config';

export default function useRegisterForm() {
    const locale = useLocale();
    const router = useRouter();
    const validation = useTranslations('Register.validation');
    const errors = useTranslations('Register.errors');
    const feedback = useTranslations('Register.feedback');
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
        featureErrors: errors,
    });
    const [isPending, startTransition] = useTransition();
    const { capture } = useRequestScope();

    const form = useForm<RegisterFormData>({
        ...FORM_VALIDATION_OPTIONS,
        resolver: zodResolver(createRegisterSchema(validation)),
        defaultValues: userDefaultValues,
    });
    const { control, getFieldState, getValues, setFocus, trigger } = form;
    const password = useWatch({ control, name: 'password' });

    useEffect(() => {
        if (getValues('confirmPassword')) {
            void trigger('confirmPassword');
        }
    }, [getValues, password, trigger]);

    useEffect(() => {
        if (isPending) {
            return;
        }

        const fieldName = [...REGISTER_FIELD_ERRORS.values()].find(
            (name) => getFieldState(name).error?.type === FORM_ERROR_TYPES.server,
        );

        if (fieldName) {
            setFocus(fieldName);
        }
    }, [getFieldState, isPending, setFocus]);

    function showUnconfirmedRegistration() {
        toast.warning(feedback('outcomeUnconfirmed.title'), {
            description: feedback('outcomeUnconfirmed.message'),
        });
    }

    function onSubmit(data: RegisterFormData) {
        if (isPending) {
            return;
        }

        dismissError();
        const isCurrent = capture();

        startTransition(async () => {
            let result: RegisterResult;

            try {
                result = await registerUser(locale, data);
            } catch {
                if (isCurrent()) showUnconfirmedRegistration();
                return;
            }

            if (!isCurrent()) return;

            if (result.status === OPERATION_STATUS.error) {
                if (isUnconfirmedApiOutcome(result.error)) {
                    showUnconfirmedRegistration();
                    return;
                }

                const { errorCode } = result.error;
                const fieldName = REGISTER_FIELD_ERRORS.get(errorCode);

                if (fieldName && errors.has(errorCode)) {
                    form.setError(fieldName, {
                        type: FORM_ERROR_TYPES.server,
                        message: errors(errorCode),
                    });
                    return;
                }

                showError(result.error);
                return;
            }

            const { verificationId, emailQueued, emailSent, resendAvailableAt } = result.data;

            form.reset();

            router.push({
                pathname: APP_ROUTES.verifyEmail,
                query: {
                    verificationId,
                    resendAvailableAt,
                    ...(!emailSent && !emailQueued && {
                        [EMAIL_VERIFICATION_QUERY_PARAMS.delivery]: EMAIL_VERIFICATION_DELIVERY.unconfirmed,
                    }),
                },
            });
        });
    }

    return {
        form,
        onSubmit,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
