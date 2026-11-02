import { cleanup, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it } from 'vitest';

import { Alert } from './alert';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe('Alert', () => {
  it('announces success as a status', () => {
    render(
      <Alert
        status='success'
        title='Saved'
        message='Changes were saved.'
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Saved');
    expect(screen.getByRole('status').textContent).toContain(
      'Changes were saved.',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces warnings as alerts', () => {
    render(
      <Alert
        status='warning'
        title='Warning'
        message='Check the details.'
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Warning');
    expect(screen.getByRole('alert').textContent).toContain(
      'Check the details.',
    );
  });

  it('announces errors without accessibility violations', async () => {
    const { container } = render(
      <Alert
        status='error'
        title='Error'
        message='Could not save.'
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'Could not save.',
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
