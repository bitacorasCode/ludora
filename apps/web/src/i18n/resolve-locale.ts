import { hasLocale } from 'next-intl';

import { type Locale, routing } from './routing';

export function resolveLocale(locale: string): Locale {
    return hasLocale(routing.locales, locale)
        ? locale
        : routing.defaultLocale;
}
