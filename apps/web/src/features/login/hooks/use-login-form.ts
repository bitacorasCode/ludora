'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import {
    ACTION_ERROR_CODES,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { createLoginSchema, type LoginFormData } from '@/lib/schemas';

import { loginUser } from '../actions';

export default function useLoginForm() {
    const locale = useLocale();
    const validation = useTranslations('Login.validation');

    const [submissionResult, setSubmissionResult] =
        useState<ActionResult | null>(null);

    const [isPending, startTransition] = useTransition();

    const form = useForm<LoginFormData>({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: zodResolver(createLoginSchema(validation)),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    function clearSubmission() {
        setSubmissionResult(null);
    }

    function onSubmit(data: LoginFormData) {
        clearSubmission();

        startTransition(async () => {
            try {
                const result = await loginUser(locale, data);

                setSubmissionResult(result);
            } catch {
                setSubmissionResult({
                    status: OPERATION_STATUS.error,
                    error: {
                        errorCode: ACTION_ERROR_CODES.unexpected,
                    },
                });
            }
        });
    }

    const submissionError =
        submissionResult?.status === OPERATION_STATUS.error
            ? submissionResult.error
            : null;

    const isSuccess =
        submissionResult?.status === OPERATION_STATUS.success;

    return {
        form,
        onSubmit,
        clearSubmission,
        submissionError,
        isSuccess,
        isSubmitting: form.formState.isSubmitting || isPending,
    };
}