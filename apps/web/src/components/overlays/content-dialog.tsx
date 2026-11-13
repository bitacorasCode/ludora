'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

type ContentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: ReactElement;
  className?: string;
  children: ReactNode;
};

export function ContentDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  className,
  children,
}: ContentDialogProps) {
  const actions = useTranslations('Common.actions');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

export const ContentDialogClose = DialogClose;
