import { useTranslations } from 'next-intl';

import { BodyText } from '@/components/typography';

type EmailSettingsContentProps = {
  email: string;
  isPreview?: boolean;
};

export function EmailSettingsContent({
  email,
  isPreview = false,
}: EmailSettingsContentProps) {
  const t = useTranslations('UserSettings');

  return (
    <>
      <BodyText className='break-all font-medium text-foreground'>
        {email}
      </BodyText>
      {isPreview && <BodyText className='text-sm'>{t('previewEmail')}</BodyText>}
    </>
  );
}
