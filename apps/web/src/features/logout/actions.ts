'use server';

import { redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/resolve-locale';
import { deleteSession } from '@/lib/session';

export async function logoutUser(locale: string): Promise<void> {
    const validLocale = resolveLocale(locale);

    await deleteSession();

    redirect({ href: '/', locale: validLocale });
}
