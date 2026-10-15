import { hasLocale, useLocale } from 'next-intl';

import { NotFoundPageContent } from '@/features/not-found';
import { routing } from '@/i18n/routing';

export default function NotFound() {
  const locale = useLocale();
  const resolvedLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;

  return <NotFoundPageContent locale={resolvedLocale} />;
}
