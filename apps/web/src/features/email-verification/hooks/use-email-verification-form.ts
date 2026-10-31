'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { APP_ROUTES } from '@/config/routes';
import { useActionErrorToast, useCountdown } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import {
    ACTION_ERROR_CODES,
    OPERATION_STATUS,
} from '@/lib/actions';
import { HTTP_STATUS } from '@/lib/api/constants';
import { FORM_ERROR_TYPES, FORM_VALIDATION_OPTIONS } from '@/lib/forms';
import {
    createEmailVerificationSchema,
    type EmailVerificationFormData,
} from '@/lib/schemas';

import { resendVerification, verifyEmail } from '../actions';
import { EMAIL_VERIFICATION_ERROR_CODES } from '../config';
import { updateVerificationLocation } from '../utils/update-verification-location';

type EmailVerificationFormOptions = {
    verificationId: string;
    initialWaitSeconds: number;
    deliveryUnconfirmed: boolean;
};

export default function useEmailVerificationForm({
    verificationId,
    initialWaitSeconds,
    deliveryUnconfirmed: initialDeliveryUnconfirmed,
}: EmailVerificationFormOptions) {
    const locale = useLocale();
    const validation = useTranslations('EmailVerification.validation');
    const errors = useTranslations('EmailVerification.errors');
    const feedback = useTranslations('EmailVerification.feedback');
    const resend = useTranslations('EmailVerification.resend');
    const router = useRouter();
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
        featureErrors: errors,
    });
    const resendFeedback = useActionErrorToast({
        title: resend('errorTitle'),
        featureErrors: errors,
    });
    const [isPending, startTransition] = useTransition();
    const [isResending, startResend] = useTransition();
    const [deliveryUnconfirmed, setDeliveryUnconfirmed] = useState(initialDeliveryUnconfirmed);
    const { secondsRemaining, restart } = useCountdown(initialWaitSeconds);
    const isActive = useRef(false);
    const requestInFlight = useRef(false);
    const focusCodeAfterResend = useRef(false);

    const form = useForm<EmailVerificationFormData>({
        ...FORM_VALIDATION_OPTIONS,
        resolver: zodResolver(createEmailVerificationSchema(validation)),
        defaultValues: {
            verificationId,
            code: '',
        },
    });
    const { getFieldState, setFocus } = form;

    useEffect(() => {
        isActive.current = true;

        return () => {
            isActive.current = false;
        };
    }, []);

    useEffect(() => {
        if (isPending || isResending) return;

        if (focusCodeAfterResend.current || getFieldState('code').error?.type === FORM_ERROR_TYPES.server) {
            focusCodeAfterResend.current = false;
            setFocus('code');
        }
    }, [getFieldState, isPending, isResending, setFocus]);

    function beginRequest() {
        if (requestInFlight.current) return false;

        requestInFlight.current = true;
        dismissError();
        resendFeedback.dismissError();

        return true;
    }

    function onSubmit(data: EmailVerificationFormData) {
        if (!beginRequest()) return;

        startTransition(async () => {
            try {
                const result = await verifyEmail(locale, {
                    ...data,
                    verificationId,
                });

                if (!isActive.current) return;

                if (result.status === OPERATION_STATUS.error) {
                    const { errorCode } = result.error;

                    if (errorCode === EMAIL_VERIFICATION_ERROR_CODES.codeInvalid) {
                        form.setError('code', {
                            type: FORM_ERROR_TYPES.server,
                            message: errors(errorCode),
                        });
                        return;
                    }

                    showError(result.error);
                    return;
                }

                form.reset();
                router.replace(APP_ROUTES.accountProfile);
                router.refresh();
            } catch {
                showError({
                    errorCode: ACTION_ERROR_CODES.unexpected,
                });
            } finally {
                requestInFlight.current = false;
            }
        });
    }

    function onResend() {
        if (secondsRemaining > 0 || !beginRequest()) return;

        startResend(async () => {
            try {
                const result = await resendVerification(locale, { verificationId });

                if (!isActive.current) return;

                if (result.status === OPERATION_STATUS.error) {
                    const { errorCode, statusCode, retryAfterSeconds, retryAt } = result.error;
                    const isRateLimited = statusCode === HTTP_STATUS.tooManyRequests
                        || errorCode === EMAIL_VERIFICATION_ERROR_CODES.resendTooSoon;

                    if (isRateLimited && retryAfterSeconds !== undefined) {
                        restart(retryAfterSeconds);

                        if (retryAt) {
                            updateVerificationLocation({
                                verificationId,
                                resendAvailableAt: retryAt,
                            });
                        }
                    }

                    resendFeedback.showError(result.error);
                    return;
                }

                const { emailSent, resendAvailableAt, retryAfterSeconds } = result.data;

                restart(retryAfterSeconds);
                setDeliveryUnconfirmed(!emailSent);
                form.resetField('code');
                focusCodeAfterResend.current = true;
                updateVerificationLocation({
                    verificationId,
                    resendAvailableAt,
                    deliveryUnconfirmed: !emailSent,
                });

                if (emailSent) {
                    toast.success(resend('successTitle'), {
                        description: resend('successMessage'),
                    });
                } else {
                    toast.warning(feedback('deliveryUnconfirmedTitle'), {
                        description: feedback('deliveryUnconfirmedMessage'),
                    });
                }
            } catch {
                resendFeedback.showError({
                    errorCode: ACTION_ERROR_CODES.unexpected,
                });
            } finally {
                requestInFlight.current = false;
            }
        });
    }

    return {
        form,
        onSubmit,
        onResend,
        secondsRemaining,
        deliveryUnconfirmed,
        isResending,
        isBusy: form.formState.isSubmitting || isPending || isResending,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
