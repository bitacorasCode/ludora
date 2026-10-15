import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import AccountError from './error';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountError integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <AccountError retry={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('alert', {
      name: esMessages.RouteError.title,
      description: esMessages.RouteError.description,
    })).toBeTruthy();

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('calls retry when the user clicks the retry button', () => {
    const retry = vi.fn();

    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <AccountError retry={retry} />
      </NextIntlClientProvider>,
    );

    expect(retry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: esMessages.RouteError.retry }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it('preserves the active locale in the home link', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <AccountError retry={vi.fn()} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: esMessages.RouteError.backHome }).getAttribute('href')).toBe('/es');
  });

  it('lets the user retry and reach the home link with the keyboard', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();

    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <AccountError retry={retry} />
      </NextIntlClientProvider>,
    );

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: esMessages.RouteError.retry }));

    await user.keyboard('{Enter}');
    expect(retry).toHaveBeenCalledOnce();

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: esMessages.RouteError.backHome }));
  });
});
