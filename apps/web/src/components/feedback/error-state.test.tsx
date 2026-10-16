import { cleanup, render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Link from 'next/link';
import { afterEach, describe, expect, it } from 'vitest';

import { Button } from '@/components/ui';
import esMessages from '@/messages/es.json';

import { ErrorState } from './error-state';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe('ErrorState', () => {
  it('renders an accessible title and description without actions', () => {
    render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
      />,
    );
    const alert = screen.getByRole('alert', {
      name: esMessages.RouteError.title,
      description: esMessages.RouteError.description,
    });
    expect(
      within(alert).getByRole('heading', { name: esMessages.RouteError.title }),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders a primary action independently', () => {
    render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
        primaryAction={
          <Button type='button'>{esMessages.Common.actions.retry}</Button>
        }
      />,
    );
    expect(
      screen.getByRole('button', { name: esMessages.Common.actions.retry }),
    ).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders a secondary action independently', () => {
    render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
        secondaryAction={
          <Link href='/es'>{esMessages.Common.actions.backHome}</Link>
        }
      />,
    );
    expect(
      screen.getByRole('link', { name: esMessages.Common.actions.backHome }),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('didnt have accessibility violations with both actions', async () => {
    const { container } = render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
        primaryAction={
          <Button type='button'>{esMessages.Common.actions.retry}</Button>
        }
        secondaryAction={
          <Link href='/es'>{esMessages.Common.actions.backHome}</Link>
        }
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
