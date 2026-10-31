import type { Locale as DateFnsLocale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

import { resolveLocale } from './resolve-locale';
import type { Locale } from './routing';

const dateFnsLocales = {
  es,
  en: enUS,
} satisfies Record<Locale, DateFnsLocale>;

export function getDateFnsLocale(locale: string): DateFnsLocale {
  return dateFnsLocales[resolveLocale(locale)];
}
