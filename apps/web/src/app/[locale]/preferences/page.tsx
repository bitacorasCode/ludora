import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageContainer, PageSection } from '@/components/layout';
import { isLoggedIn } from '@/config/auth';
import { PreferencesPageContent } from '@/features/preferences';
import { redirect } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/preferences'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Preferences' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PreferencesPage({
  params,
}: PageProps<'/[locale]/preferences'>) {
  const { locale } = await params;

  if (isLoggedIn) {
    redirect({ href: '/account/preferences', locale });
  }

  const t = await getTranslations({ locale, namespace: 'Preferences' });

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <PreferencesPageContent />
      </PageSection>
    </PageContainer>
  );
}
