'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from '@/i18n/navigation';
import {
    ACTION_ERROR_CODES,
    type ActionError,
    OPERATION_STATUS,
} from '@/lib/actions';
import {
    createRegisterSchema,
    type RegisterFormData,
} from '@/lib/schemas';

import { type RegisterResult, registerUser } from '../actions';
import { userDefaultValues } from '../config';

export default function useRegisterForm() {
    const locale = useLocale();
    const router = useRouter();
    const validation = useTranslations('Register.validation');

    const [submissionError, setSubmissionError] =
        useState<ActionError | null>(null);
    const [isPending, startTransition] = useTransition();

    const form = useForm<RegisterFormData>({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: zodResolver(createRegisterSchema(validation)),
        defaultValues: userDefaultValues,
    });

    function clearSubmission() {
        setSubmissionError(null);
    }

    function onSubmit(data: RegisterFormData) {
        if (isPending) {
            return;
        }

        clearSubmission();

        startTransition(async () => {
            let result: RegisterResult;

            try {
                result = await registerUser(locale, data);
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

            const { verificationId, emailSent } = result.data;

            form.reset();

            router.push({
                pathname: '/verify-email',
                query: {
                    verificationId,
                    ...(!emailSent && { delivery: 'unconfirmed' }),
                },
            });
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
