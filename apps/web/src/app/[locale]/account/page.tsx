import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';

import { AccountAccess } from './_components/account-access';

export default async function AccountPage({
  params,
}: PageProps<'/[locale]/account'>) {
  const { locale } = await params;

  return (
    <AccountAccess locale={locale}>
      {() => redirect({ href: APP_ROUTES.accountProfile, locale })}
    </AccountAccess>
  );
}
