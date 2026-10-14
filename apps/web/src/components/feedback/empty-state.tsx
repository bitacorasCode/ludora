import type { ReactNode } from 'react';

import { BodyText, SectionTitle } from '@/components/typography';
import { Card, CardFooter, CardHeader } from '@/components/ui';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card variant='empty'>
      <CardHeader>
        <SectionTitle>{title}</SectionTitle>
        <BodyText>{description}</BodyText>
      </CardHeader>
      {action && <CardFooter>{action}</CardFooter>}
    </Card>
  );
}
