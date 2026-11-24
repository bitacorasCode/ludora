'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useId, useSyncExternalStore } from 'react';

import { Switch } from '@/components/ui';
import { THEME } from '@/config/theme';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useMounted() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('ThemeSwitch');
  const id = useId();
  const mounted = useMounted();
  const isDark = resolvedTheme === THEME.dark;

  return (
    <div className='flex items-center gap-2'>
      <Switch
        id={id}
        aria-label={t('label')}
        checked={mounted && isDark}
        disabled={!mounted}
        onCheckedChange={(checked) =>
          setTheme(checked ? THEME.dark : THEME.light)
        }
      />
      <span aria-hidden='true' className='text-sm text-muted-foreground'>
        {mounted && t(isDark ? 'dark' : 'light')}
      </span>
    </div>
  );
}
