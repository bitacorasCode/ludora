'use client';

import type { ReactNode } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { usePathname } from '@/i18n/navigation';

type HeaderAccountMenuProps = {
  children: ReactNode;
  fallback: ReactNode;
};

export function HeaderAccountMenu({ children, fallback }: HeaderAccountMenuProps) {
  const pathname = usePathname();

  return pathname === APP_ROUTES.completeGoogleAuth ? fallback : children;
}
