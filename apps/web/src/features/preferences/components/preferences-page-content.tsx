import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/language';
import { ItemList, type ItemListEntry } from '@/components/lists';
import { ThemeSwitch } from '@/components/theme';
import { PageHeading } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

export function PreferencesPageContent() {
  const t = useTranslations('Preferences');
  const items = [
    {
      id: 'appearance',
      title: t('appearanceTitle'),
      description: t('appearanceDescription'),
      content: <ThemeSwitch />,
    },
    {
      id: 'language',
      title: t('languageTitle'),
      description: t('languageDescription'),
      content: <LocaleSwitcher />,
    },
  ] satisfies readonly ItemListEntry[];

  return (
    <>
      <PageHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <Card>
        <CardContent>
          <ItemList items={items} ariaLabel={t('title')} />
        </CardContent>
      </Card>
    </>
  );
}
