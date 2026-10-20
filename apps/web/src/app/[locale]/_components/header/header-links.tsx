import { useTranslations } from 'next-intl';

import { SideMenuClose } from '@/components/overlays';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

const links = [
  { href: '/games', label: 'games' },
  { href: '/ranking', label: 'ranking' },
] as const;

export type HeaderLinksProps = {
  isSideMenu?: boolean;
};

export function HeaderLinks({ isSideMenu }: HeaderLinksProps) {
  const t = useTranslations('Header');

  return links.map(({ href, label }) => {
    const button = (
      <Button
        key={href}
        asChild
        variant='ghost'
        size='sm'
        className={isSideMenu ? 'justify-start' : undefined}
      >
        <Link href={href}>{t(label)}</Link>
      </Button>
    );

    return isSideMenu ? (
      <SideMenuClose key={href} asChild>
        {button}
      </SideMenuClose>
    ) : (
      button
    );
  });
}
