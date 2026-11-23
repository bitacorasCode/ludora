import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui';

type ProfileIdentityCardProps = {
  avatar: ReactNode;
  name: ReactNode;
  action: ReactNode;
  bio: ReactNode;
};

export function ProfileIdentityCard({ avatar, name, action, bio }: ProfileIdentityCardProps) {
  return (
    <Card>
      <CardContent className='grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5'>
        <div className='col-start-1 row-span-2 row-start-1'>{avatar}</div>
        <div className='col-start-2 row-start-1 min-w-0'>{name}</div>
        <div className='col-start-2 row-start-2 min-h-9 w-32 max-w-full sm:col-start-3 sm:row-start-1'>
          {action}
        </div>
        <div className='col-start-1 col-end-3 row-start-3 min-w-0 sm:col-start-2 sm:col-end-4 sm:row-start-2'>
          {bio}
        </div>
      </CardContent>
    </Card>
  );
}
