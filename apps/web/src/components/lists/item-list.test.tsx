import { cleanup, render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it } from 'vitest';

import { ItemList } from './item-list';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe('ItemList', () => {
  it('renders an empty named list without separators', () => {
    const { container } = render(
      <ItemList ariaLabel='Preferences' items={[]} />,
    );
    expect(screen.getByRole('list', { name: 'Preferences' })).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      0,
    );
  });

  it('renders one item without a separator or optional description', () => {
    const { container } = render(
      <ItemList
        ariaLabel='Preferences'
        items={[
          {
            id: 'theme',
            title: 'Theme',
            content: <button type='button'>Change theme</button>,
          },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(screen.getByRole('group', { name: 'Theme' })).getByRole('button', {
        name: 'Change theme',
      }),
    ).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      0,
    );
  });

  it('places separators only between items and preserves description associations', async () => {
    const { container } = render(
      <ItemList
        ariaLabel='Account'
        items={[
          {
            id: 'email',
            title: 'Email',
            description: 'Your private email',
            content: 'jugador@example.com',
          },
          {
            id: 'password',
            title: 'Password',
            description: 'Coming soon',
            descriptionId: 'password-help',
            content: (
              <button type='button' aria-describedby='password-help'>
                Change password
              </button>
            ),
          },
          { id: 'theme', title: 'Theme', content: 'Dark' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      2,
    );
    expect(items[0].querySelector('[data-slot="separator"]')).toBeNull();
    expect(items[2].lastElementChild?.getAttribute('data-slot')).toBe('field');
    expect(
      screen.getByRole('button', {
        name: 'Change password',
        description: 'Coming soon',
      }),
    ).toBeTruthy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
