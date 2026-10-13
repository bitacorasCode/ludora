'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { UserRegistrationFormData, userRegistrationSchema } from '@/lib/schemas';

import { registerUser } from '../actions';
import { userDefaultValues } from '../config';

export default function useRegisterForm() {
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const form = useForm<UserRegistrationFormData>({
        mode: 'onTouched',
        reValidateMode: 'onChange',
        resolver: zodResolver(userRegistrationSchema),
        defaultValues: {
            ...userDefaultValues,
        },
    });

    const hasValidationErrors = Object.keys(form.formState.errors).length > 0;

    async function onSubmit(data: UserRegistrationFormData) {
        setSubmissionError(null);

        const result = await registerUser(data);

        if (result.errors) {
            setSubmissionError(result.errors[0]);
        }
    }

    return {
        form,
        submissionError,
        hasValidationErrors,
        onSubmit,
    };
}
