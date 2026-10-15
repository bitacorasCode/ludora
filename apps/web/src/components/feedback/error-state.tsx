import { type ReactNode, useId } from 'react';

import { BodyText, SectionTitle } from '@/components/typography';
import { Card, CardFooter, CardHeader } from '@/components/ui';

type ErrorStateProps = {
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

export function ErrorState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: ErrorStateProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <Card className='border-destructive/40'>
      <CardHeader
        role='alert'
        aria-atomic='true'
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <SectionTitle id={titleId}>{title}</SectionTitle>
        <BodyText id={descriptionId}>{description}</BodyText>
      </CardHeader>
      {(primaryAction || secondaryAction) && (
        <CardFooter className='flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
          {primaryAction}
          {secondaryAction}
        </CardFooter>
      )}
    </Card>
  );
}
