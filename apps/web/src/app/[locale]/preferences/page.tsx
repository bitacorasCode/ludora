import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageContainer, PageSection } from '@/components/layout';
import { APP_ROUTES } from '@/config/routes';
import { PreferencesPageContent } from '@/features/preferences';

import { GuestOnly } from '../_components/auth/guest-only';

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
  const t = await getTranslations({
    locale,
    namespace: 'Preferences',
  });

  return (
    <GuestOnly locale={locale} redirectTo={APP_ROUTES.accountPreferences}>
      <PageContainer>
        <PageSection aria-label={t('title')}>
          <PreferencesPageContent />
        </PageSection>
      </PageContainer>
    </GuestOnly>
  );
}
