import { useTranslations } from 'next-intl';

import { SectionNavigation } from '@/components/navigation';
import { APP_ROUTES } from '@/config/routes';
import { LogoutButton } from '@/features/logout';

const links = [
  { href: APP_ROUTES.accountProfile, label: 'profile' },
  { href: APP_ROUTES.accountSettings, label: 'settings' },
  { href: APP_ROUTES.accountActivity, label: 'activity' },
  { href: APP_ROUTES.accountPreferences, label: 'preferences' },
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
