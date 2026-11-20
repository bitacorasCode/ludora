'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { usePathname } from '@/i18n/navigation';

export function RefreshHeaderOnLogin() {
  const pathname = usePathname();
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (pathname !== APP_ROUTES.login) {
      refreshed.current = false;
      return;
    }

    if (refreshed.current) return;

    refreshed.current = true;
    router.refresh();
  }, [pathname, router]);

  return null;
}
