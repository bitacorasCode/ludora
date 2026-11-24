'use client';

import type { ComponentProps, ReactNode } from 'react';

import { SideMenuClose } from '@/components/overlays/side-menu';
import { buttonVariants } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type HeaderNavLinkProps = {
  href: ComponentProps<typeof Link>['href'];
  children: ReactNode;
  isSideMenu?: boolean;
};

export function HeaderNavLink({ href, children, isSideMenu }: HeaderNavLinkProps) {
  const pathname = usePathname();
  const isActive = isSideMenu && pathname === href;
  const link = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }),
        isSideMenu && 'h-auto min-h-8 justify-start py-1',
        isActive && '[&_[data-slot=header-nav-label]]:underline [&_[data-slot=header-nav-label]]:decoration-2 [&_[data-slot=header-nav-label]]:underline-offset-4',
      )}
    >
      {typeof children === 'string' ? <span data-slot='header-nav-label'>{children}</span> : children}
    </Link>
  );

  return isSideMenu ? <SideMenuClose asChild>{link}</SideMenuClose> : link;
}
