import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ItemList, type ItemListEntry } from '@/components/lists';
import { PageHeading } from '@/components/typography';
import { Card, CardContent, Skeleton } from '@/components/ui';

import { CreatePasswordButton } from './create-password-button';
import { EmailSettingsContent } from './email-settings-content';
import { PasswordSettingsContent } from './password-settings-content';

type UserSettings = {
  userId: string;
  email: string;
  hasPassword: boolean;
};

type UserSettingsPageContentProps = UserSettings | { pending: true };

export function UserSettingsPageHeading() {
  const t = useTranslations('UserSettings');

  return <PageHeading eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}

export function UserSettingsPageContent(props: UserSettingsPageContentProps) {
  const t = useTranslations('UserSettings');
  const pending = 'pending' in props;
  const passwordDescriptionId = useId();
  const passwordDescriptionPlaceholder = (
    <span className='grid auto-rows-[1lh] items-center'>
      <Skeleton as='span' className='block h-4 w-full max-w-96' />
      <Skeleton as='span' className='block h-4 w-2/3' />
    </span>
  );
  let passwordAction = <Skeleton className='h-8 w-36' />;

  if (!pending) {
    const { hasPassword, userId } = props;
    passwordAction = hasPassword
      ? <PasswordSettingsContent userId={userId} descriptionId={passwordDescriptionId} />
      : <CreatePasswordButton userId={userId} descriptionId={passwordDescriptionId} />;
  }

  const items = [
    {
      id: 'email',
      title: t('email.title'),
      description: t('email.description'),
      content: pending
        ? <Skeleton className='h-5 w-40 max-w-full' />
        : <EmailSettingsContent email={props.email} />,
    },
    {
      id: 'password',
      title: t('password.title'),
      description: pending
        ? passwordDescriptionPlaceholder
        : t(props.hasPassword ? 'password.description' : 'password.create.description'),
      descriptionId: passwordDescriptionId,
      content: passwordAction,
    },
  ] satisfies readonly ItemListEntry[];

  return (
    <Card>
      <CardContent>
        {pending && <span role='status' className='sr-only'>{t('loading')}</span>}
        <ItemList items={items} ariaLabel={t('title')} />
      </CardContent>
    </Card>
  );
}
