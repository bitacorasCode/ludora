import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { SideMenu, SideMenuClose } from '../overlays/side-menu';
import { LocaleSwitcher } from '../language/locale-switcher';

const links = [
  { href: '/#catalog', label: 'games' },
  { href: '/#ranking', label: 'ranking' },
] as const;

export function Header() {
  const t = useTranslations('Header');

  return (
    <header className='sticky top-0 z-40 border-b bg-background/90 backdrop-blur'>
      <nav
        aria-label={t('mainNavigation')}
        className='mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'
      >
        <Button asChild variant='link' size='sm'>
          <Link href='/'>
            <span
              aria-hidden='true'
              className='grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground'
            >
              L
            </span>
            <span>Ludora</span>
          </Link>
        </Button>

        <div className='hidden items-center gap-6 md:flex'>
          {links.map((link) => (
            <Button asChild key={link.href} variant='link' size='sm'>
              <Link href={link.href}>{t(link.label)}</Link>
            </Button>
          ))}
        </div>

        <LocaleSwitcher />

        <SideMenu
          trigger={
            <Button variant='outline' size='sm' className='md:hidden'>
              {t('menu')}
            </Button>
          }
          title={t('menuTitle')}
          description={t('menuDescription')}
          navigationLabel={t('mobileNavigation')}
        >
          {links.map((link) => (
            <SideMenuClose asChild key={link.href}>
              <div>
                <Button asChild variant='link' size='sm'>
                  <Link href={link.href}>{t(link.label)}</Link>
                </Button>
              </div>
            </SideMenuClose>
          ))}
          <LocaleSwitcher />
        </SideMenu>
      </nav>
    </header>
  );
}
