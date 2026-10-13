'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useId, useSyncExternalStore } from 'react';

import { Switch } from '@/components/ui';

export function ThemeSwitch({ showLabel = false }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('ThemeSwitch');
  const id = useId();

  const subscribe = () => () => {};
  const getClientSnapshot = () => true;
  const getServerSnapshot = () => false;

  function useMounted() {
    return useSyncExternalStore(
      subscribe,
      getClientSnapshot,
      getServerSnapshot,
    );
  }

  const mounted = useMounted();

  return (
    <div className='flex items-center gap-2'>
      <Switch
        id={id}
        aria-label={t('label')}
        checked={mounted && resolvedTheme === 'dark'}
        disabled={!mounted}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      {showLabel && <label htmlFor={id}>{t('label')}</label>}
    </div>
  );
}
