import type { ReactNode } from 'react';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui';

type SideMenuProps = {
  trigger: ReactNode;
  title: ReactNode;
  description: ReactNode;
  navigationLabel: string;
  children: ReactNode;
};

export function SideMenu({
  trigger,
  title,
  description,
  navigationLabel,
  children,
}: SideMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent side='right'>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <nav aria-label={navigationLabel} className='flex flex-col gap-4 px-6'>
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export const SideMenuClose = SheetClose;
