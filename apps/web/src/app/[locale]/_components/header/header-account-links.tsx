import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { ProfileAvatar } from '@/features/profile';
import { type CurrentUser, getCurrentUser } from '@/lib/auth';

import { HeaderNavLink } from './header-nav-link';
import { RefreshHeaderOnLogin } from './refresh-header-on-login';

type HeaderAccountLinksProps = {
  isSideMenu?: boolean;
};

const getHeaderAccountNavigation = cache(async () => {
  const t = await getTranslations();
  let user: CurrentUser | null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error('Unable to load the header session.', error);

    return { unavailableMessage: t('Header.session.unavailable') };
  }

  const links = user
    ? [
        {
          href: APP_ROUTES.accountProfile,
          content: (
            <>
              <ProfileAvatar
                nickname={user.nickname}
                avatarPresetId={user.avatarPresetId}
                size='sm'
              />
              <span className='min-w-0'>
                <span data-slot='header-nav-label' className='block lg:hidden'>
                  {t('Account.title')}
                </span>
                <span className='block max-w-40 truncate text-xs text-muted-foreground lg:text-sm lg:text-current'>
                  {user.nickname}
                </span>
              </span>
            </>
          ),
        },
      ]
    : [
        { href: APP_ROUTES.preferences, content: t('Header.preferences') },
        { href: APP_ROUTES.login, content: t('Header.login') },
        { href: APP_ROUTES.register, content: t('Header.register') },
      ];

  return { links, isAuthenticated: user !== null };
});

export async function HeaderAccountLinks({
  isSideMenu = false,
}: HeaderAccountLinksProps) {
  const navigation = await getHeaderAccountNavigation();

  if (navigation.unavailableMessage !== undefined) {
    return <span role='status'>{navigation.unavailableMessage}</span>;
  }

  const { links, isAuthenticated } = navigation;

  return (
    <>
      {isAuthenticated && !isSideMenu && <RefreshHeaderOnLogin />}
      {links.map(({ href, content }) => (
        <HeaderNavLink key={href} href={href} isSideMenu={isSideMenu}>
          {content}
        </HeaderNavLink>
      ))}
    </>
  );
}
