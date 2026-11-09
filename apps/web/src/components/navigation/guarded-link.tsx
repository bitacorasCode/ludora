'use client';

import { useRouter } from 'next/navigation';
import { type ComponentProps, type MouseEvent, useRef } from 'react';

import { Link as LocaleLink } from '@/i18n/navigation';

import { useNavigationGuard } from './navigation-guard-provider';

type GuardedLinkProps = Omit<
  ComponentProps<typeof LocaleLink>,
  'legacyBehavior'
>;

type LinkNavigationEvent = Parameters<
  NonNullable<GuardedLinkProps['onNavigate']>
>[0];

export function GuardedLink({
  href,
  replace,
  scroll,
  transitionTypes,
  onClick,
  onNavigate,
  ...props
}: GuardedLinkProps) {
  const router = useRouter();
  const { isBlocked, requestNavigation } = useNavigationGuard();
  const clickedHref = useRef<string | null>(null);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    clickedHref.current = event.currentTarget.href;
    onClick?.(event);
  }

  function handleNavigate(event: LinkNavigationEvent) {
    let preventedByConsumer = false;

    onNavigate?.({
      preventDefault() {
        preventedByConsumer = true;
        event.preventDefault();
      },
    });

    if (preventedByConsumer || !isBlocked()) return;

    const destinationHref = clickedHref.current;

    if (!destinationHref) return;

    const destination = new URL(destinationHref);
    const current = new URL(window.location.href);

    if (destination.origin !== current.origin) return;

    const isSameDocument =
      destination.pathname === current.pathname &&
      destination.search === current.search;

    if (isSameDocument) return;

    event.preventDefault();

    requestNavigation(() => {
      const options = { scroll, transitionTypes };

      if (replace) {
        router.replace(destination.href, options);
        return;
      }

      router.push(destination.href, options);
    });
  }

  return (
    <LocaleLink
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      transitionTypes={transitionTypes}
      onClick={handleClick}
      onNavigate={handleNavigate}
    />
  );
}
