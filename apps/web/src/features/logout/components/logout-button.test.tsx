import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import esMessages from '@/messages/es.json';

import { logoutUser } from '../actions';
import { LogoutButton } from './logout-button';

vi.mock('../actions', () => ({ logoutUser: vi.fn() }));
beforeEach(() => vi.mocked(logoutUser).mockReset());
afterEach(() => cleanup());

describe('LogoutButton', () => {
  it('runs the logout action with the current locale and displays its pending state', async () => {
    const action = Promise.withResolvers<ActionResult>();
    vi.mocked(logoutUser).mockReturnValue(action.promise);
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LogoutButton />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Logout.submit }),
    );
    const pendingButton = await screen.findByRole('button', {
      name: esMessages.Logout.submitting,
    });
    expect(pendingButton.hasAttribute('disabled')).toBe(true);
    expect(logoutUser).toHaveBeenCalledExactlyOnceWith('es');
    await act(async () => action.resolve({ status: OPERATION_STATUS.success, data: null }));
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: esMessages.Logout.submit })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
  });
});
