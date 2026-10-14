'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
    createRegisterSchema,
    type RegisterFormData,
} from '@/lib/schemas';

import { registerUser } from '../actions';
import { userDefaultValues } from '../config';

type SubmissionFeedback = {
    status: 'error' | 'warning';
    title: string;
    message: string;
};

export default function useRegisterForm() {
    const [submissionFeedback, setSubmissionFeedback] =
        useState<SubmissionFeedback | null>(null);

    const locale = useLocale();
    const t = useTranslations('Register.validation');
    const tFeedback = useTranslations('Register.feedback'); const schema = createRegisterSchema((key) => t(key));

    const form = useForm<RegisterFormData>({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: zodResolver(schema),
        defaultValues: {
            ...userDefaultValues,
        },
    });

    async function onSubmit(data: RegisterFormData) {
        setSubmissionFeedback(null);

        try {
            const result = await registerUser(locale, data);

            if (result.status === 'invalid') {
                setSubmissionFeedback({
                    status: 'error',
                    title: tFeedback('errorTitle'),
                    message: result.errors[0] ?? tFeedback('unexpectedError'),
                });
                return;
            }

            setSubmissionFeedback({
                status: 'warning',
                title: tFeedback('title'),
                message: tFeedback('unavailable'),
            });
        } catch {
            setSubmissionFeedback({
                status: 'error',
                title: tFeedback('errorTitle'),
                message: tFeedback('unexpectedError'),
            });
        }
    }

    return {
        form,
        submissionFeedback,
        onSubmit,
    };
}
