import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/language';
import { ThemeSwitch } from '@/components/theme';
import { BodyText, PageHeading, SectionTitle } from '@/components/typography';
import { Card, CardContent, CardHeader } from '@/components/ui';

export function PreferencesPageContent() {
  const t = useTranslations('Preferences');

  return (
    <>
      <PageHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <Card>
        <CardHeader>
          <SectionTitle>{t('appearanceTitle')}</SectionTitle>
          <BodyText>{t('appearanceDescription')}</BodyText>
        </CardHeader>
        <CardContent>
          <ThemeSwitch showLabel />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <SectionTitle>{t('languageTitle')}</SectionTitle>
          <BodyText>{t('languageDescription')}</BodyText>
        </CardHeader>
        <CardContent>
          <LocaleSwitcher />
        </CardContent>
      </Card>
    </>
  );
}
