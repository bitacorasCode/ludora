'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

import { AccountShell } from '@/features/account';

import ActivityLoading from '../activity/loading';
import AccountLoading from '../loading';
import PreferencesLoading from '../preferences/loading';
import SettingsLoading from '../settings/loading';

const sectionFallbacks = new Map(Object.entries({
  activity: <ActivityLoading />,
  preferences: <PreferencesLoading />,
  settings: <SettingsLoading />,
}));

export function AccountFrameFallback() {
  const segment = useSelectedLayoutSegment();
  const fallback = segment ? sectionFallbacks.get(segment) : undefined;

  return (
    <AccountShell pending>
      {fallback ?? <AccountLoading />}
    </AccountShell>
  );
}
