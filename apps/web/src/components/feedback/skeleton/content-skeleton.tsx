import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

import { SKELETON_DEFAULTS } from './constants';
import { HeadingSkeleton } from './variants/heading-skeleton';
import { ListSkeleton } from './variants/list-skeleton';
import { RowSkeleton, type RowSkeletonProps } from './variants/row-skeleton';
import { TextSkeleton } from './variants/text-skeleton';

const MINIMUM_LIST_ITEMS = 1;

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
    descriptionLines = SKELETON_DEFAULTS.descriptionLines,
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
    case 'list': {
      const items = props.items ?? SKELETON_DEFAULTS.items;

      if (!Number.isFinite(items) || items < MINIMUM_LIST_ITEMS) {
        return null;
      }

      content = (
        <ListSkeleton items={items} descriptionLines={descriptionLines} />
      );
      break;
    }
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
