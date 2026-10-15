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
  it('renders the title and description as an accessible alert without actions', () => {
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

    expect(within(alert).getByRole('heading', { name: esMessages.RouteError.title })).toBeTruthy();
    expect(within(alert).getByText(esMessages.RouteError.description)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders only the primary action when provided', () => {
    render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
        primaryAction={
          <Button type='button'>{esMessages.RouteError.retry}</Button>
        }
      />,
    );

    expect(screen.getByRole('button', { name: esMessages.RouteError.retry })).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders only the secondary action when provided', () => {
    render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
        secondaryAction={
          <Button asChild variant='outline'>
            <Link href='/es'>{esMessages.RouteError.backHome}</Link>
          </Button>
        }
      />,
    );

    expect(screen.getByRole('link', { name: esMessages.RouteError.backHome })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('didnt have accessibility violations with both actions', async () => {
    const { container } = render(
      <ErrorState
        title={esMessages.RouteError.title}
        description={esMessages.RouteError.description}
        primaryAction={
          <Button type='button'>{esMessages.RouteError.retry}</Button>
        }
        secondaryAction={
          <Button asChild variant='outline'>
            <Link href='/es'>{esMessages.RouteError.backHome}</Link>
          </Button>
        }
      />,
    );

    expect(screen.getByRole('button', { name: esMessages.RouteError.retry })).toBeTruthy();
    expect(screen.getByRole('link', { name: esMessages.RouteError.backHome })).toBeTruthy();

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
