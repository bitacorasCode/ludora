import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui';

import { ProfileIdentityCard } from './profile-identity-card';

export function ProfileSkeleton() {
  const t = useTranslations('Profile');
  const label = t('loading');

  return (
    <div role='status' aria-label={label}>
      <span className='sr-only'>{label}</span>
      <ProfileIdentityCard
        avatar={<Skeleton className='size-20 rounded-full' />}
        name={
          <div className='flex h-8 items-center sm:h-9'>
            <Skeleton className='h-6 w-40 max-w-full' />
          </div>
        }
        action={<Skeleton className='h-9 w-full rounded-lg' />}
        bio={
          <div className='flex h-7 items-center'>
            <Skeleton className='h-5 w-full max-w-md' />
          </div>
        }
      />
    </div>
  );
}
