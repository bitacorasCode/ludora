import { Skeleton } from '@/components/ui';

export function HeadingSkeleton() {
  return (
    <div aria-hidden='true' className='w-full max-w-3xl space-y-4'>
      <Skeleton className='h-5 w-36 max-w-full' />
      <Skeleton className='h-10 w-3/4 sm:h-15' />
      <div className='py-1.5'>
        <Skeleton className='h-5 w-full' />
      </div>
    </div>
  );
}
