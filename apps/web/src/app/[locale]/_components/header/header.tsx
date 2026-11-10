import 'server-only';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { SideMenu } from '@/components/overlays';
import { Button, Skeleton } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

import { HeaderAccountLinks } from './header-account-links';
import { HeaderLinks } from './header-links';

export function Header() {
  const t = useTranslations('Header');

  const sessionFallback = (
    <div role='status'>
      <span className='sr-only'>{t('session.loading')}</span>
      <Skeleton className='h-9 w-28' />
    </div>
  );

  return (
    <header className='sticky top-0 z-40 border-b bg-card/90 backdrop-blur'>
      <nav
        aria-label={t('navigation.main')}
        className='mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'
      >
        <Button asChild variant='link' size='sm'>
          <Link href={APP_ROUTES.home}>
            <span
              aria-hidden='true'
              className='grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground'
            >
              L
            </span>
            <span>Ludora</span>
          </Link>
        </Button>

        <div className='hidden items-center gap-6 lg:flex'>
          <HeaderLinks />

          <Suspense fallback={sessionFallback}>
            <HeaderAccountLinks />
          </Suspense>
        </div>

        <SideMenu
          trigger={
            <Button variant='outline' size='sm' className='lg:hidden'>
              {t('menu.label')}
            </Button>
          }
          title={t('menu.title')}
          description={t('menu.description')}
          navigationLabel={t('navigation.mobile')}
        >
          <Suspense fallback={sessionFallback}>
            <HeaderAccountLinks isSideMenu />
          </Suspense>
          <HeaderLinks isSideMenu />
        </SideMenu>
      </nav>
    </header>
  );
}
