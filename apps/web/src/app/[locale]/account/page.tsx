import { redirect } from '@/i18n/navigation';

export default async function AccountPage({
  params,
}: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  redirect({ href: '/account/profile', locale });
}
