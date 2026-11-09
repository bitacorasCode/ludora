import 'server-only';

import { getTranslations } from 'next-intl/server';

import { GuardedLink as Link } from '@/components/navigation';
import { SideMenuClose } from '@/components/overlays';
import { Button } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { getCurrentUser } from '@/lib/auth';

type HeaderAccountLinksProps = {
  isSideMenu?: boolean;
};

export async function HeaderAccountLinks({
  isSideMenu = false,
}: HeaderAccountLinksProps) {
  const t = await getTranslations('Header');

  try {
    const user = await getCurrentUser();

    const links = user
      ? ([{ href: APP_ROUTES.accountProfile, label: 'account' }] as const)
      : ([
          { href: APP_ROUTES.preferences, label: 'preferences' },
          { href: APP_ROUTES.login, label: 'login' },
          { href: APP_ROUTES.register, label: 'register' },
        ] as const);

    return links.map(({ href, label }) => {
      const button = (
        <Button
          asChild
          key={href}
          variant='ghost'
          size='sm'
          className={isSideMenu ? 'justify-start' : undefined}
        >
          <Link href={href}>{t(label)}</Link>
        </Button>
      );

      return isSideMenu ? (
        <SideMenuClose asChild key={href}>
          {button}
        </SideMenuClose>
      ) : (
        button
      );
    });
  } catch (error) {
    console.error('Unable to load the header session.', error);

    return <span role='status'>{t('session.unavailable')}</span>;
  }
}
