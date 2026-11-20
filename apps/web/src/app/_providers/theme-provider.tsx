'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { type ReactNode, useEffect, useRef } from 'react';

import { FAVICON_BY_THEME, THEME } from '@/config/theme';

function ThemeFavicon() {
  const { systemTheme } = useTheme();
  const icon = useRef<HTMLLinkElement>(null);

  useEffect(() => {
    if (icon.current && systemTheme) {
      icon.current.href = FAVICON_BY_THEME[systemTheme];
    }
  }, [systemTheme]);

  return (
    <link
      ref={icon}
      rel='icon'
      href={FAVICON_BY_THEME[THEME.light]}
      sizes='any'
      type='image/svg+xml'
    />
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme={THEME.system}
      enableSystem
      disableTransitionOnChange
    >
      <ThemeFavicon />
      {children}
    </NextThemesProvider>
  );
}
