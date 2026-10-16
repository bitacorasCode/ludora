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
      <ItemList ariaLabel='Preferencias' items={[]} />,
    );
    expect(screen.getByRole('list', { name: 'Preferencias' })).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      0,
    );
  });

  it('renders one item without a separator or optional description', () => {
    const { container } = render(
      <ItemList
        ariaLabel='Preferencias'
        items={[
          {
            id: 'theme',
            title: 'Tema',
            content: <button type='button'>Cambiar tema</button>,
          },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(screen.getByRole('group', { name: 'Tema' })).getByRole('button', {
        name: 'Cambiar tema',
      }),
    ).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(
      0,
    );
  });

  it('places separators only between items and preserves description associations', async () => {
    const { container } = render(
      <ItemList
        ariaLabel='Cuenta'
        items={[
          {
            id: 'email',
            title: 'Correo',
            description: 'Tu correo privado',
            content: 'jugador@example.com',
          },
          {
            id: 'password',
            title: 'Contraseña',
            description: 'Disponible próximamente',
            descriptionId: 'password-help',
            content: (
              <button type='button' aria-describedby='password-help'>
                Cambiar contraseña
              </button>
            ),
          },
          { id: 'theme', title: 'Tema', content: 'Oscuro' },
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
        name: 'Cambiar contraseña',
        description: 'Disponible próximamente',
      }),
    ).toBeTruthy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
