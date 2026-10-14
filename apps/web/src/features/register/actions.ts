'use server';

import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import {
    createRegisterSchema,
    type RegisterFormData,
} from '@/lib/schemas';

export type RegisterResult =
    | { status: 'invalid'; errors: string[] }
    | { status: 'unavailable' };

export async function registerUser(
    locale: string,
    formData: RegisterFormData,
): Promise<RegisterResult> {
    const validLocale = hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale;

    const t = await getTranslations({
        locale: validLocale,
        namespace: 'Register.validation',
    });

    const schema = createRegisterSchema((key) => t(key));
    const result = schema.safeParse(formData);

    if (!result.success) {
        return {
            status: 'invalid',
            errors: result.error.issues.map((issue) => issue.message),
        };
    }

    return { status: 'unavailable' };
}