import { cleanup, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it } from 'vitest';

import { FeedbackAlert } from './feedback-alert';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe('FeedbackAlert', () => {
  it('announces success as a status', () => {
    render(
      <FeedbackAlert
        status='success'
        title='Guardado'
        message='Los cambios se guardaron.'
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Guardado');
    expect(screen.getByRole('status').textContent).toContain(
      'Los cambios se guardaron.',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces warnings as alerts', () => {
    render(
      <FeedbackAlert
        status='warning'
        title='Atención'
        message='Revisa los datos.'
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Atención');
    expect(screen.getByRole('alert').textContent).toContain(
      'Revisa los datos.',
    );
  });

  it('announces errors without accessibility violations', async () => {
    const { container } = render(
      <FeedbackAlert
        status='error'
        title='Error'
        message='No se pudo guardar.'
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'No se pudo guardar.',
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
