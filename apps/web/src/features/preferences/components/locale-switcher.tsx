'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useTransition } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';

// The locale segment remounts the selector when navigation completes.
let pendingLocaleFocus: { locale: Locale; pathname: string } | null = null;

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('LocaleSwitcher');
  const [isPending, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);

  const localeLabels: Record<Locale, string> = {
    es: t('es'),
    en: t('en'),
  };

  useEffect(() => {
    if (isPending || !pendingLocaleFocus) return;

    const destination = pendingLocaleFocus;
    pendingLocaleFocus = null;

    if (destination.locale === locale && destination.pathname === pathname) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, [isPending, locale, pathname]);

  function handleLocaleChange(value: string) {
    const nextLocale = routing.locales.find((supportedLocale) => supportedLocale === value);
    if (!nextLocale || nextLocale === locale) return;

    const { search, hash } = window.location;

    startTransition(() => {
      pendingLocaleFocus = { locale: nextLocale, pathname };
      router.replace(`${pathname}${search}${hash}`, {
        locale: nextLocale,
        scroll: false,
      });
    });
  }

  return (
    <div className='flex items-center gap-3'>
      <Select
        value={locale}
        onValueChange={handleLocaleChange}
        disabled={isPending}
      >
        <SelectTrigger ref={trigger} aria-label={t('label')} className='w-36'>
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {routing.locales.map((supportedLocale) => (
            <SelectItem key={supportedLocale} value={supportedLocale}>
              {localeLabels[supportedLocale]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
