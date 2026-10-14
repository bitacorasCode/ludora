import { Skeleton } from '@/components/ui';

export function ProfileIdentitySkeleton() {
  return (
    <>
      <Skeleton className='size-20 shrink-0 rounded-full' />
      <div className='w-full min-w-0 flex-1 space-y-3'>
        <Skeleton className='h-8 w-40 max-w-full' />
        <Skeleton className='h-5 w-64 max-w-full' />
      </div>
      <Skeleton className='h-9 w-28 sm:self-center' />
    </>
  );
}
