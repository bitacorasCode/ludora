'use client';

import { useId, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('LocaleSwitcher');
  const labelId = useId();
  const [isPending, startTransition] = useTransition();

  const localeLabels: Record<Locale, string> = {
    es: t('es'),
    en: t('en'),
  };

  function handleLocaleChange(value: string) {
    if (!routing.locales.some((supportedLocale) => supportedLocale === value)) {
      return;
    }

    const hash = window.location.hash;

    startTransition(() => {
      router.replace(`${pathname}${hash}`, { locale: value as Locale });
    });
  }

  return (
    <div className='flex items-center gap-3'>
      <span id={labelId} className='text-sm text-muted-foreground'>
        {t('label')}
      </span>

      <Select
        value={locale}
        onValueChange={handleLocaleChange}
        disabled={isPending}
      >
        <SelectTrigger aria-labelledby={labelId} className='w-36'>
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
