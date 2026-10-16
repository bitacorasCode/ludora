import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useTheme } from 'next-themes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { ThemeSwitch } from './theme-switch';

vi.mock('next-themes', () => ({ useTheme: vi.fn() }));

const setTheme = vi.fn();

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue({
    themes: ['light', 'dark'],
    resolvedTheme: 'light',
    setTheme,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ThemeSwitch integration', () => {
  it('reflects a light theme and requests dark mode when activated', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ThemeSwitch />
      </NextIntlClientProvider>,
    );
    const control = screen.getByRole('switch', {
      name: esMessages.ThemeSwitch.label,
    });
    expect(control.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(control);
    expect(setTheme).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('reflects a dark theme and requests light mode when deactivated', () => {
    vi.mocked(useTheme).mockReturnValue({
      themes: ['light', 'dark'],
      resolvedTheme: 'dark',
      setTheme,
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ThemeSwitch />
      </NextIntlClientProvider>,
    );
    const control = screen.getByRole('switch', {
      name: esMessages.ThemeSwitch.label,
    });
    expect(control.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(control);
    expect(setTheme).toHaveBeenCalledExactlyOnceWith('light');
  });

  it('lets the user change the theme with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ThemeSwitch />
      </NextIntlClientProvider>,
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('switch', { name: esMessages.ThemeSwitch.label }),
    );
    await user.keyboard(' ');
    expect(setTheme).toHaveBeenCalledExactlyOnceWith('dark');
  });
});
