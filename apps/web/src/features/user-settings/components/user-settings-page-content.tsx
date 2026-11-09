import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ItemList, type ItemListEntry } from '@/components/lists';
import { PageHeading } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

import { previewUserSettings } from '../config';
import { EmailSettingsContent } from './email-settings-content';
import { PasswordSettingsContent } from './password-settings-content';

export function UserSettingsPageContent() {
  const t = useTranslations('UserSettings');
  const passwordDescriptionId = useId();
  const items = [
    {
      id: 'email',
      title: t('email.title'),
      description: t('email.description'),
      content: <EmailSettingsContent email={previewUserSettings.email} isPreview />,
    },
    {
      id: 'password',
      title: t('password.title'),
      description: t('password.unavailable'),
      descriptionId: passwordDescriptionId,
      content: <PasswordSettingsContent descriptionId={passwordDescriptionId} />,
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
