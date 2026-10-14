import type { Metadata } from 'next';

import { isLoggedIn } from '@/config/auth';
import { AccountShell } from '@/features/account/components';
import { redirect } from '@/i18n/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
  params,
}: LayoutProps<'/[locale]/account'>) {
  const { locale } = await params;

  if (!isLoggedIn) {
    redirect({ href: '/login', locale });
  }

  return <AccountShell>{children}</AccountShell>;
}
