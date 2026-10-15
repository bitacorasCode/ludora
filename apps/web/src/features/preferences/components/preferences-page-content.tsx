import { useTranslations } from 'next-intl';

import { ItemList, type ItemListEntry } from '@/components/lists';
import { PageHeading } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

import { LocaleSwitcher } from './locale-switcher';
import { ThemeSwitch } from './theme-switch';

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
