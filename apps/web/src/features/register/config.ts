import type { DefaultValues } from 'react-hook-form';

import type { UserRegistrationFormData } from '@/lib/schemas';

type RegisterField =
    | {
        name: Exclude<keyof UserRegistrationFormData, 'birthDate'>;
        type: 'string';
        inputType: 'text' | 'email' | 'password';
        autoComplete: string;
        defaultValue: string;
    }
    | {
        name: 'birthDate';
        type: 'date';
        defaultValue: Date | undefined;
    };

export const userFields = [
    {
        name: 'nickname',
        type: 'string',
        inputType: 'text',
        autoComplete: 'nickname',
        defaultValue: '',
    },
    {
        name: 'names',
        type: 'string',
        inputType: 'text',
        autoComplete: 'given-name',
        defaultValue: '',
    },
    {
        name: 'lastNames',
        type: 'string',
        inputType: 'text',
        autoComplete: 'family-name',
        defaultValue: '',
    },
    {
        name: 'birthDate',
        type: 'date',
        defaultValue: undefined,
    },
    {
        name: 'email',
        type: 'string',
        inputType: 'email',
        autoComplete: 'email',
        defaultValue: '',
    },
    {
        name: 'password',
        type: 'string',
        inputType: 'password',
        autoComplete: 'new-password',
        defaultValue: '',
    },
] as const satisfies readonly RegisterField[];

export const userDefaultValues = Object.fromEntries(
    userFields.map(({ name, defaultValue }) => [name, defaultValue]),
) as DefaultValues<UserRegistrationFormData>;