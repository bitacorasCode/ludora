'use client';

import type { ComponentProps, ReactNode } from 'react';

import { SideMenuClose } from '@/components/overlays/side-menu';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type HeaderNavLinkProps = {
  href: ComponentProps<typeof Link>['href'];
  children: ReactNode;
  isSideMenu?: boolean;
};

export function HeaderNavLink({ href, children, isSideMenu }: HeaderNavLinkProps) {
  const link = (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        isSideMenu && 'justify-start',
      )}
    >
      {children}
    </Link>
  );

  return isSideMenu ? <SideMenuClose asChild>{link}</SideMenuClose> : link;
}
