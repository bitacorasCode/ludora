'use server';

import { hasLocale } from 'next-intl';

import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { deleteSession } from '@/lib/session';

export async function logoutUser(locale: string): Promise<void> {
    const validLocale = hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale;

    await deleteSession();

    redirect({ href: '/', locale: validLocale });
}