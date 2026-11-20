import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { APP_ROUTES } from '@/config/routes';
import { ProfileAvatar } from '@/features/profile';
import { type CurrentUser, getCurrentUser } from '@/lib/auth';

import { HeaderNavLink } from './header-nav-link';
import { RefreshHeaderOnLogin } from './refresh-header-on-login';

type HeaderAccountLinksProps = {
  isSideMenu?: boolean;
};

export async function HeaderAccountLinks({
  isSideMenu = false,
}: HeaderAccountLinksProps) {
  const t = await getTranslations('Header');
  let user: CurrentUser | null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error('Unable to load the header session.', error);

    return <span role='status'>{t('session.unavailable')}</span>;
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
              <span className='max-w-40 truncate'>{user.nickname}</span>
            </>
          ),
        },
      ]
    : [
        { href: APP_ROUTES.preferences, content: t('preferences') },
        { href: APP_ROUTES.login, content: t('login') },
        { href: APP_ROUTES.register, content: t('register') },
      ];

  return (
    <>
      {user && !isSideMenu && <RefreshHeaderOnLogin />}
      {links.map(({ href, content }) => (
        <HeaderNavLink key={href} href={href} isSideMenu={isSideMenu}>
          {content}
        </HeaderNavLink>
      ))}
    </>
  );
}
