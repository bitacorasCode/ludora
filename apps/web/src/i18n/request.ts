import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { type Locale,routing } from './routing';

const messages = {
    es: () => import('../messages/es.json').then((module) => module.default),
    en: () => import('../messages/en.json').then((module) => module.default),
} satisfies Record<Locale, () => Promise<object>>;

export default getRequestConfig(async ({ locale }) => {
    let requestLocale = locale;

    if (!requestLocale) {
        const paramLocale = await rootParams.locale();

        if (!hasLocale(routing.locales, paramLocale)) {
            notFound();
        }

        requestLocale = paramLocale;
    }

    if (!hasLocale(routing.locales, requestLocale)) {
        notFound();
    }

    return {
        locale: requestLocale,
        messages: await messages[requestLocale](),
    };
});