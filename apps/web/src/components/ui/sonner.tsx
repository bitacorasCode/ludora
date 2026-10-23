'use client';

import {
  Alert02Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { Spinner } from './spinner';

const TOAST_DURATION_MS = 6_000;
const TOAST_VISIBLE_COUNT = 1;
const TOAST_TOP_OFFSET = 'calc(5rem + env(safe-area-inset-top))';

export function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme();
  const t = useTranslations('Notification');

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position='top-right'
      duration={TOAST_DURATION_MS}
      visibleToasts={TOAST_VISIBLE_COUNT}
      closeButton
      containerAriaLabel={t('label')}
      offset={{
        top: TOAST_TOP_OFFSET,
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
      mobileOffset={{
        top: TOAST_TOP_OFFSET,
        left: 'max(1rem, env(safe-area-inset-left))',
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
      icons={{
        success: (
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className='size-4 text-emerald-700 dark:text-emerald-300'
            aria-hidden='true'
          />
        ),
        info: (
          <HugeiconsIcon
            icon={InformationCircleIcon}
            className='size-4 text-primary'
            aria-hidden='true'
          />
        ),
        warning: (
          <HugeiconsIcon
            icon={Alert02Icon}
            className='size-4 text-amber-700 dark:text-amber-300'
            aria-hidden='true'
          />
        ),
        error: (
          <HugeiconsIcon
            icon={CancelCircleIcon}
            className='size-4 text-destructive'
            aria-hidden='true'
          />
        ),
        loading: <Spinner aria-hidden='true' role='presentation' aria-label={undefined} />,
        close: (
          <HugeiconsIcon
            icon={Cancel01Icon}
            className='size-3'
            aria-hidden='true'
          />
        ),
      }}
      style={{
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--border-radius': 'var(--radius)',
        fontFamily: 'var(--font-sans)',
      } as CSSProperties}
      toastOptions={{
        closeButtonAriaLabel: t('close'),
        classNames: {
          toast: 'border-border! bg-popover! text-popover-foreground! shadow-lg!',
          title: 'text-sm!',
          description: 'text-muted-foreground!',
          closeButton: 'size-7! border-border! bg-popover! text-popover-foreground! focus-visible:ring-2! focus-visible:ring-ring!',
          actionButton: 'bg-primary! text-primary-foreground!',
          cancelButton: 'bg-secondary! text-secondary-foreground!',
        },
      }}
      {...props}
    />
  );
}
