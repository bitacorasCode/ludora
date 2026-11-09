import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { GuardedLink as Link } from '@/components/navigation';
import { SideMenuClose } from '@/components/overlays';
import { Button } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { ProfileAvatar } from '@/features/profile';
import { type CurrentUser, getCurrentUser } from '@/lib/auth';

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
    ? [{
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
      }]
    : [
        { href: APP_ROUTES.preferences, content: t('preferences') },
        { href: APP_ROUTES.login, content: t('login') },
        { href: APP_ROUTES.register, content: t('register') },
      ];

  return links.map(({ href, content }) => {
    const button = (
      <Button
        asChild
        key={href}
        variant='ghost'
        size='sm'
        className={isSideMenu ? 'justify-start' : undefined}
      >
        <Link href={href}>{content}</Link>
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
}
