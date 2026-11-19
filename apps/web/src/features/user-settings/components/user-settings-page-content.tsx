import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ItemList, type ItemListEntry } from '@/components/lists';
import { PageHeading } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

import { CreatePasswordButton } from './create-password-button';
import { EmailSettingsContent } from './email-settings-content';
import { PasswordSettingsContent } from './password-settings-content';

type UserSettingsPageContentProps = {
  userId: string;
  email: string;
  hasPassword: boolean;
};

export function UserSettingsPageContent({ userId, email, hasPassword }: UserSettingsPageContentProps) {
  const t = useTranslations('UserSettings');
  const passwordDescriptionId = useId();
  const items = [
    {
      id: 'email',
      title: t('email.title'),
      description: t('email.description'),
      content: <EmailSettingsContent email={email} />,
    },
    {
      id: 'password',
      title: t('password.title'),
      description: t(hasPassword ? 'password.description' : 'password.create.description'),
      descriptionId: passwordDescriptionId,
      content: hasPassword
        ? <PasswordSettingsContent userId={userId} descriptionId={passwordDescriptionId} />
        : <CreatePasswordButton userId={userId} descriptionId={passwordDescriptionId} />,
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
