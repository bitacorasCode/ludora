import type { Locale as DateFnsLocale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { hasLocale } from 'next-intl';

import { type Locale, routing } from './routing';

const dateFnsLocales = {
  es,
  en: enUS,
} satisfies Record<Locale, DateFnsLocale>;

export function getDateFnsLocale(locale: string): DateFnsLocale {
  const resolvedLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;

  return dateFnsLocales[resolvedLocale];
}
