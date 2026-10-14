'use client';

import { Button } from '@/components/ui';
import { Link, usePathname } from '@/i18n/navigation';

export type SectionNavigationItem = {
  href: string;
  label: string;
};

type SectionNavigationProps = {
  items: readonly SectionNavigationItem[];
  ariaLabel: string;
  title?: string;
};

export function SectionNavigation({
  items,
  ariaLabel,
  title,
}: SectionNavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={ariaLabel} className='space-y-4'>
      {title && (
        <p className='font-heading text-sm font-semibold text-muted-foreground'>
          {title}
        </p>
      )}
      <ul className='flex gap-2 overflow-x-auto pb-1 lg:flex-col'>
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className='shrink-0'>
              <Button
                asChild
                variant={isActive ? 'secondary' : 'ghost'}
                className='w-full justify-start'
              >
                <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                  {item.label}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
