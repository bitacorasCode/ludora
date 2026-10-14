'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui';
import { Link, usePathname } from '@/i18n/navigation';

const links = [
  { href: '/account/profile', label: 'profile' },
  { href: '/account/preferences', label: 'preferences' },
] as const;

export function AccountNavigation() {
  const t = useTranslations('Account');
  const pathname = usePathname();

  return (
    <nav aria-label={t('navigationLabel')} className='space-y-4'>
      <p className='font-heading text-sm font-semibold text-muted-foreground'>
        {t('title')}
      </p>
      <ul className='flex gap-2 overflow-x-auto pb-1 lg:flex-col'>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href} className='shrink-0'>
              <Button
                asChild
                variant={isActive ? 'secondary' : 'ghost'}
                className='w-full justify-start'
              >
                <Link href={link.href} aria-current={isActive ? 'page' : undefined}>
                  {t(link.label)}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
