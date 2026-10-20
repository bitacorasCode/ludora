import { useTranslations } from 'next-intl';

import { SectionNavigation } from '@/components/navigation';
import { LogoutButton } from '@/features/logout';

const links = [
  { href: '/account/profile', label: 'profile' },
  { href: '/account/settings', label: 'settings' },
  { href: '/account/activity', label: 'activity' },
  { href: '/account/preferences', label: 'preferences' },
] as const;

export function AccountNavigation() {
  const t = useTranslations('Account');

  return (
    <div className='space-y-4'>
      <SectionNavigation
        title={t('title')}
        ariaLabel={t('navigationLabel')}
        items={links.map(({ href, label }) => ({
          href,
          label: t(label),
        }))}
      />

      <LogoutButton />
    </div>
  );
}
