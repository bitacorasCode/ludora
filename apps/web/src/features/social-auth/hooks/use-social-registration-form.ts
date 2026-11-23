'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AUTH_ERROR_CODES, AUTH_NEXT_STEP } from '@ludora/security';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { APP_ROUTES } from '@/config/routes';
import {
    EMAIL_VERIFICATION_DELIVERY,
    EMAIL_VERIFICATION_QUERY_PARAMS,
} from '@/features/email-verification/config';
import { useActionErrorToast, useRequestScope } from '@/hooks';
import { useRouter } from '@/i18n/navigation';
import { type ActionError, isUnconfirmedApiOutcome, OPERATION_STATUS } from '@/lib/actions';
import { FORM_ERROR_TYPES, FORM_VALIDATION_OPTIONS } from '@/lib/forms';
import { withSessionLock } from '@/lib/session/session-lock';

import {
    completeSocialRegistration,
    type CompleteSocialRegistrationResult,
} from '../actions';
import { getSocialAuthErrorLocation } from '../locations';
import { createSocialRegistrationSchema, type SocialRegistrationFormData } from '../schema';

const FIELD_ERRORS = new Map<string, keyof SocialRegistrationFormData>([
    [AUTH_ERROR_CODES.nicknameAlreadyExists, 'nickname'],
    [AUTH_ERROR_CODES.emailAlreadyExists, 'email'],
    [AUTH_ERROR_CODES.oauthEmailRequired, 'email'],
    [AUTH_ERROR_CODES.oauthAccountLinkRequired, 'email'],
]);

export function useSocialRegistrationForm(requiresEmail: boolean) {
    const locale = useLocale();
    const router = useRouter();
    const validation = useTranslations('Register.validation');
    const registerErrors = useTranslations('Register.errors');
    const errors = useTranslations('SocialAuth.errors');
    const feedback = useTranslations('Register.feedback');
    const { showError, dismissError } = useActionErrorToast({
        title: feedback('errorTitle'),
        featureErrors: errors,
    });
    const [isPending, startTransition] = useTransition();
    const requestInFlight = useRef(false);
    const { capture } = useRequestScope();

    const form = useForm<SocialRegistrationFormData>({
        ...FORM_VALIDATION_OPTIONS,
        resolver: zodResolver(createSocialRegistrationSchema(validation, requiresEmail)),
        defaultValues: { nickname: '', email: '' },
    });
    const { getFieldState, setFocus } = form;

    useEffect(() => {
        if (isPending) return;

        const field = [...FIELD_ERRORS.values()].find(
            (name) => getFieldState(name).error?.type === FORM_ERROR_TYPES.server,
        );

        if (field) setFocus(field);
    }, [getFieldState, isPending, setFocus]);

    function showUnconfirmedRegistration() {
        toast.warning(feedback('outcomeUnconfirmed.title'), {
            description: feedback('outcomeUnconfirmed.message'),
        });
    }

    function handleError(error: ActionError) {
        if (isUnconfirmedApiOutcome(error)) {
            showUnconfirmedRegistration();
            return;
        }

        const { errorCode } = error;

        if (
            errorCode === AUTH_ERROR_CODES.oauthRegistrationInvalid
            || errorCode === AUTH_ERROR_CODES.oauthIdentityAlreadyLinked
        ) {
            router.replace(getSocialAuthErrorLocation(error));
            return;
        }

        const field = FIELD_ERRORS.get(errorCode);

        if (field === 'email' && !requiresEmail) {
            router.replace(getSocialAuthErrorLocation({
                errorCode: AUTH_ERROR_CODES.oauthAccountLinkRequired,
            }));
            return;
        }

        if (field) {
            form.setError(field, {
                type: FORM_ERROR_TYPES.server,
                message: registerErrors.has(errorCode)
                    ? registerErrors(errorCode)
                    : errors(errorCode),
            });
            return;
        }

        showError(error);
    }

    function onSubmit(data: SocialRegistrationFormData) {
        if (requestInFlight.current) return;

        requestInFlight.current = true;
        dismissError();
        const isCurrent = capture();

        startTransition(async () => {
            let result: CompleteSocialRegistrationResult | null;

            try {
                result = await withSessionLock(async () =>
                    isCurrent() ? completeSocialRegistration(locale, data) : null,
                );
            } catch {
                if (isCurrent()) showUnconfirmedRegistration();
                return;
            } finally {
                requestInFlight.current = false;
            }

            if (!result || !isCurrent()) return;

            if (result.status === OPERATION_STATUS.error) {
                handleError(result.error);
                return;
            }

            form.reset();

            if (result.data.nextStep === AUTH_NEXT_STEP.authenticated) {
                router.replace(APP_ROUTES.home);
                router.refresh();
                return;
            }

            const { verificationId, emailQueued, emailSent, resendAvailableAt } = result.data;

            router.replace({
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

    return { form, onSubmit, isSubmitting: form.formState.isSubmitting || isPending };
}
