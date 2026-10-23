'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from '@/i18n/navigation';
import {
    ACTION_ERROR_CODES,
    type ActionError,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import {
    createEmailVerificationSchema,
    type EmailVerificationFormData,
} from '@/lib/schemas';

import { verifyEmail } from '../actions';

export default function useEmailVerificationForm(verificationId: string) {
    const locale = useLocale();
    const validation = useTranslations('EmailVerification.validation');
    const router = useRouter();

    const [submissionError, setSubmissionError] =
        useState<ActionError | null>(null);
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

    function clearSubmission() {
        setSubmissionError(null);
    }

    function onSubmit(data: EmailVerificationFormData) {
        if (isPending) {
            return;
        }

        clearSubmission();

        startTransition(async () => {
            let result: ActionResult;

            try {
                result = await verifyEmail(locale, {
                    ...data,
                    verificationId,
                });
            } catch {
                setSubmissionError({
                    errorCode: ACTION_ERROR_CODES.unexpected,
                });
                return;
            }

            if (result.status === OPERATION_STATUS.error) {
                setSubmissionError(result.error);
                return;
            }

            router.replace('/account/profile');
            router.refresh();
        });
    }

    return {
        form,
        onSubmit,
        clearSubmission,
        submissionError,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}
