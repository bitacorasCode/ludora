import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ProfilePageContent } from '@/features';
import { previewProfile } from '@/features/profile/config';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/profile'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Profile' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AccountProfilePage() {
  return <ProfilePageContent profile={previewProfile} />;
}
