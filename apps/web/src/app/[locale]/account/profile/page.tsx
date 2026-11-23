import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';

import { ProfilePageContent, ProfilePageHeading, ProfileSkeleton } from '@/features/profile';
import { validateProfileOwner } from '@/features/profile/schema';
import { profileApi } from '@/features/profile/server/profile-api';
import { isAuthenticationError, OPERATION_STATUS } from '@/lib/actions';
import type { CurrentUser } from '@/lib/auth';

import { SessionRecovery } from '../../_components/auth/session-recovery';
import { AccountAccess } from '../_components/account-access';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/profile'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Profile' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

async function ProfileContent({ user, fallback }: { user: CurrentUser; fallback: ReactNode }) {
  const result = validateProfileOwner(await profileApi.get(), user.id);

  if (result.status === OPERATION_STATUS.error && isAuthenticationError(result.error)) {
    return <SessionRecovery fallback={fallback} inline />;
  }

  return <ProfilePageContent userId={user.id} nickname={user.nickname} initialResult={result} />;
}

export default async function AccountProfilePage({
  params,
}: PageProps<'/[locale]/account/profile'>) {
  const { locale } = await params;
  const fallback = <ProfileSkeleton />;

  return (
    <>
      <ProfilePageHeading />
      <Suspense fallback={fallback}>
        <AccountAccess locale={locale} fallback={fallback}>
          {(user) => (
            <ProfileContent key={user.id} user={user} fallback={fallback} />
          )}
        </AccountAccess>
      </Suspense>
    </>
  );
}
