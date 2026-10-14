import type { DefaultValues } from 'react-hook-form';

import type { RegisterFormData } from '@/lib/schemas';

type RegisterField = {
    name: keyof RegisterFormData;
    inputType: 'text' | 'email' | 'password';
    autoComplete: string;
    defaultValue: string;
};

export const userFields = [
    {
        name: 'nickname',
        inputType: 'text',
        autoComplete: 'username',
        defaultValue: '',
    },
    {
        name: 'email',
        inputType: 'email',
        autoComplete: 'email',
        defaultValue: '',
    },
    {
        name: 'password',
        inputType: 'password',
        autoComplete: 'new-password',
        defaultValue: '',
    },
    {
        name: 'confirmPassword',
        inputType: 'password',
        autoComplete: 'new-password',
        defaultValue: '',
    },
] as const satisfies readonly RegisterField[];

export const userDefaultValues = Object.fromEntries(
    userFields.map(({ name, defaultValue }) => [name, defaultValue]),
) as DefaultValues<RegisterFormData>;
