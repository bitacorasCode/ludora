import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';

export default async function AccountPage({
  params,
}: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  redirect({ href: APP_ROUTES.accountProfile, locale });
}
