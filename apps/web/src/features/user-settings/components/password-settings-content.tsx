import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui';

type PasswordSettingsContentProps = {
  descriptionId: string;
};

export function PasswordSettingsContent({
  descriptionId,
}: PasswordSettingsContentProps) {
  const t = useTranslations('UserSettings');

  return (
    <Button
      type='button'
      variant='outline'
      disabled
      aria-describedby={descriptionId}
    >
      {t('changePassword')}
    </Button>
  );
}
