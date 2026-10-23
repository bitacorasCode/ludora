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

import esMessages from '@/messages/es.json';

import { RecoveryRequestPageContent } from './recovery-request-page-content';

vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

expect.extend(toHaveNoViolations);

beforeEach(() => {
  vi.spyOn(toast, 'warning').mockReturnValue('recovery-request-validated');
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

  it('shows an email error and keeps the preview link available for invalid data', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.emailInvalid)).toBeTruthy();
    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.request.previewReset })).toBeTruthy();
  });

  it('shows validation feedback and keeps the preview link when the email changes', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'juan@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.request.validatedMessage,
      { id: 'recovery-request-validated' },
    ));

    const preview = await screen.findByRole('link', {
      name: esMessages.PasswordRecovery.request.previewReset,
    });
    expect(preview.getAttribute('href')).toContain('/reset-password');

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.request.previewReset })).toBeTruthy();
  });
});
