import { BodyText } from '@/components/typography';

type EmailSettingsContentProps = {
  email: string;
};

export function EmailSettingsContent({
  email,
}: EmailSettingsContentProps) {
  return (
    <BodyText className='break-all font-medium text-foreground'>
      {email}
    </BodyText>
  );
}
