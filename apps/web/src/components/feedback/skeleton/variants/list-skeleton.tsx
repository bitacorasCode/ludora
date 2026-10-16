import {
  Field,
  FieldContent,
  FieldGroup,
  Separator,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';

import { TextSkeleton } from './text-skeleton';

type ListSkeletonProps = {
  items?: number;
  descriptionLines?: number;
  className?: string;
};

export function ListSkeleton({
  items = 1,
  descriptionLines = 1,
  className,
}: ListSkeletonProps) {
  const itemCount = Number.isFinite(items) ? Math.max(0, Math.floor(items)) : 0;

  if (itemCount === 0) {
    return null;
  }

  return (
    <FieldGroup aria-hidden='true' className={cn('w-full', className)}>
      <ul className='space-y-5'>
        {Array.from({ length: itemCount }, (_, index) => (
          <li key={index}>
            {index > 0 && <Separator className='mb-5' />}
            <Field orientation='responsive'>
              <FieldContent>
                <TextSkeleton withTitle lines={descriptionLines} />
              </FieldContent>
              <FieldContent className='@md/field-group:items-end'>
                <Skeleton className='h-9 w-40 max-w-full' />
              </FieldContent>
            </Field>
          </li>
        ))}
      </ul>
    </FieldGroup>
  );
}
