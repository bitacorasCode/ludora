'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { useNavigationGuard } from '@/components/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: ReactElement;
  className?: string;
  children: ReactNode;
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  className,
  children,
}: FormDialogProps) {
  const actions = useTranslations('Common.actions');
  const { requestNavigation } = useNavigationGuard();

  function closeDialog() {
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    requestNavigation(closeDialog);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className} closeLabel={actions('close')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
