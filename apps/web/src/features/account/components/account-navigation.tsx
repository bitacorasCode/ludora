import { useTranslations } from 'next-intl';

import { SectionNavigation } from '@/components/navigation';

const links = [
  { href: '/account/profile', label: 'profile' },
  { href: '/account/preferences', label: 'preferences' },
] as const;

export function AccountNavigation() {
  const t = useTranslations('Account');

  return (
    <SectionNavigation
      title={t('title')}
      ariaLabel={t('navigationLabel')}
      items={links.map((link) => ({ href: link.href, label: t(link.label) }))}
    />
  );
}
