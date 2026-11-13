'use client';

import type { ComponentProps } from 'react';

import { useNavigationGuard } from '@/components/navigation';

import { ContentDialog } from './content-dialog';

export function GuardedContentDialog({
  onOpenChange,
  ...props
}: ComponentProps<typeof ContentDialog>) {
  const { requestNavigation } = useNavigationGuard();

  function closeDialog() {
    onOpenChange(false);
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      onOpenChange(true);
      return;
    }

    requestNavigation(closeDialog);
  }

  return <ContentDialog {...props} onOpenChange={handleOpenChange} />;
}
