import { isLoggedIn } from '@/config/auth';
import { ProfileIdentity } from '@/features';
import { previewProfile } from '@/features/profile/config';
import { redirect } from '@/i18n/navigation';

export default async function ProfilePage({
  params,
}: PageProps<'/[locale]/profile'>) {
  const { locale } = await params;

  if (!isLoggedIn) {
    redirect({ href: '/login', locale });
  }

  return <ProfileIdentity profile={previewProfile} />;
}
