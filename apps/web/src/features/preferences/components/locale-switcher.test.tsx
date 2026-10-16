import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import esMessages from '@/messages/es.json';

import { LocaleSwitcher } from './locale-switcher';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/account/preferences',
  useRouter: () => ({ replace }),
}));

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView)
    HTMLElement.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('LocaleSwitcher integration', () => {
  it('shows the active locale and all configured language options', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );
    const control = screen.getByRole('combobox', {
      name: esMessages.LocaleSwitcher.label,
    });
    expect(control.textContent).toBe(esMessages.LocaleSwitcher.es);
    fireEvent.keyDown(control, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')).toHaveLength(routing.locales.length);
    expect(
      screen.getByRole('option', { name: esMessages.LocaleSwitcher.en }),
    ).toBeTruthy();
  });

  it('preserves the page, search parameters and hash when changing language', async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      '',
      '/es/account/preferences?tab=appearance&filter=a%20b#content',
    );
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    await user.click(
      screen.getByRole('option', { name: esMessages.LocaleSwitcher.en }),
    );
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      '/account/preferences?tab=appearance&filter=a%20b#content',
      { locale: 'en' },
    );
  });
});
