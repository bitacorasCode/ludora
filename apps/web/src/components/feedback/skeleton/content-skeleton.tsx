import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

import { HeadingSkeleton } from './variants/heading-skeleton';
import { ListSkeleton } from './variants/list-skeleton';
import { RowSkeleton, type RowSkeletonProps } from './variants/row-skeleton';
import { TextSkeleton } from './variants/text-skeleton';

type ContentSkeletonProps = {
  label: string;
  withCard?: boolean;
  withHeading?: boolean;
  descriptionLines?: number;
  className?: string;
} & (
  | { variant: 'text' }
  | ({ variant: 'row' } & Pick<
      RowSkeletonProps,
      'withAvatar' | 'withAction' | 'size'
    >)
  | { variant: 'list'; items?: number }
);

export function ContentSkeleton(props: ContentSkeletonProps) {
  const {
    label,
    withCard = false,
    withHeading = false,
    descriptionLines = 1,
    className,
  } = props;

  let content: ReactNode;

  switch (props.variant) {
    case 'text':
      content = <TextSkeleton lines={descriptionLines} />;
      break;
    case 'row':
      content = (
        <RowSkeleton
          descriptionLines={descriptionLines}
          withAvatar={props.withAvatar}
          withAction={props.withAction}
          size={props.size}
        />
      );
      break;
    case 'list':
      if (!Number.isFinite(props.items ?? 1) || (props.items ?? 1) < 1) {
        return null;
      }

      content = (
        <ListSkeleton items={props.items} descriptionLines={descriptionLines} />
      );
      break;
  }

  return (
    <div
      role='status'
      aria-label={label}
      className={cn('w-full space-y-6', className)}
    >
      <span className='sr-only'>{label}</span>
      {withHeading && <HeadingSkeleton />}
      {withCard ? (
        <Card>
          <CardContent>{content}</CardContent>
        </Card>
      ) : (
        content
      )}
    </div>
  );
}
