import { useLocale } from 'next-intl';

import { NotFoundPageContent } from '@/features/not-found';
import { resolveLocale } from '@/i18n/resolve-locale';

export default function NotFound() {
  const locale = useLocale();
  const resolvedLocale = resolveLocale(locale);

  return <NotFoundPageContent locale={resolvedLocale} />;
}
