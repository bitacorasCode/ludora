import { useTranslations } from 'next-intl';

import { APP_ROUTES } from '@/config/routes';

import { HeaderNavLink } from './header-nav-link';

const links = [
  { href: APP_ROUTES.games, label: 'games' },
  { href: APP_ROUTES.ranking, label: 'ranking' },
] as const;

export type HeaderLinksProps = {
  isSideMenu?: boolean;
};

export function HeaderLinks({ isSideMenu }: HeaderLinksProps) {
  const t = useTranslations('Header');

  return links.map(({ href, label }) => (
    <HeaderNavLink key={href} href={href} isSideMenu={isSideMenu}>
      {t(label)}
    </HeaderNavLink>
  ));
}
