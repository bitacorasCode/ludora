import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import esMessages from '@/messages/es.json';

import { requestPasswordRecovery } from '../../actions';
import { RecoveryRequestPageContent } from './recovery-request-page-content';

vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));
vi.mock('../../actions', () => ({ requestPasswordRecovery: vi.fn() }));

expect.extend(toHaveNoViolations);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requestPasswordRecovery).mockReset();
  vi.mocked(requestPasswordRecovery).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: null,
  });
  vi.spyOn(toast, 'success').mockReturnValue('recovery-request-success');
});

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RecoveryRequestPageContent integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders a skip link and a link back to login', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.skipToForm }).getAttribute('href')).toBe('#recovery-request-form');
    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.backToLogin }).getAttribute('href')).toContain('/login');
  });

  it('shows an email error without requesting recovery for invalid data', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: esMessages.PasswordRecovery.request.submit,
    }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.emailInvalid)).toBeTruthy();
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('requests recovery and shows generic feedback when the request is accepted', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'juan@example.com' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: esMessages.PasswordRecovery.request.submit,
    }));

    await waitFor(() => expect(requestPasswordRecovery).toHaveBeenCalledExactlyOnceWith(
      'es',
      { email: 'juan@example.com' },
    ));
    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.request.successTitle,
      {
        id: 'recovery-request-success',
        description: esMessages.PasswordRecovery.request.successMessage,
      },
    ));

    await waitFor(() => expect(
      screen.getByRole('button', {
        name: esMessages.PasswordRecovery.request.submit,
      }).hasAttribute('disabled'),
    ).toBe(false));

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    expect(requestPasswordRecovery).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
  });
});
