import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SectionNavigation } from './section-navigation';

const route = vi.hoisted(() => ({ pathname: '/account/profile' }));

vi.mock('@/i18n/navigation', () => ({
  Link: 'a',
  usePathname: () => route.pathname,
}));

const items = [
  { href: '/account/profile', label: 'Perfil' },
  { href: '/account/preferences', label: 'Preferencias' },
];

afterEach(() => {
  cleanup();
});

describe('SectionNavigation', () => {
  it('marks the current page and provides an accessible navigation name', () => {
    route.pathname = '/account/profile';
    render(
      <SectionNavigation
        items={items}
        ariaLabel='Secciones de cuenta'
        title='Mi cuenta'
      />,
    );
    expect(
      screen.getByRole('navigation', { name: 'Secciones de cuenta' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Perfil' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen
        .getByRole('link', { name: 'Preferencias' })
        .getAttribute('aria-current'),
    ).toBeNull();
  });

  it('keeps the parent section active on nested routes', () => {
    route.pathname = '/account/profile/edit';
    render(<SectionNavigation items={items} ariaLabel='Cuenta' />);
    expect(
      screen.getByRole('link', { name: 'Perfil' }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it('does not confuse similarly prefixed routes with nested routes', () => {
    route.pathname = '/account/profile-other';
    render(<SectionNavigation items={items} ariaLabel='Cuenta' />);
    expect(
      screen.getByRole('link', { name: 'Perfil' }).getAttribute('aria-current'),
    ).toBeNull();
  });
});
