import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { RegisterForm } from './register-form';

expect.extend(toHaveNoViolations);

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
});

function createPdfFile(name: string) {
  return new File(['pdf-content'], name, {
    type: 'application/pdf',
  });
}

describe('RegisterForm integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(<RegisterForm />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders a skip link to the form', () => {
    render(<RegisterForm />);

    const skipLink = screen.getByRole('link', { name: 'Saltar al formulario' });

    expect(skipLink.getAttribute('href')).toBe('#register-form');
  });

  it('show specific errors when trying to save with invalid fields', async () => {
    const { container } = render(<RegisterForm />);

    fireEvent.change(screen.getByPlaceholderText('12.XXX.XXX-X'), {
      target: { value: '12.345.678-9' },
    });

    fireEvent.change(screen.getByPlaceholderText('Juan'), {
      target: { value: 'Juan' },
    });

    fireEvent.change(screen.getByPlaceholderText('Perez'), {
      target: { value: 'Pérez' },
    });

    fireEvent.change(screen.getByPlaceholderText('+56 9 XXXX XXXX'), {
      target: { value: '+56 9 1234 5678' },
    });

    fireEvent.change(screen.getByPlaceholderText('juan.perez@gmail.com'), {
      target: { value: 'juan@example.com' },
    });

    fireEvent.change(screen.getByPlaceholderText('AA-BB-12'), {
      target: { value: 'AB-CD-12' },
    });

    fireEvent.change(screen.getByPlaceholderText('Honda'), {
      target: { value: 'Honda' },
    });

    fireEvent.change(screen.getByPlaceholderText('Accord'), {
      target: { value: 'Civic' },
    });

    fireEvent.change(screen.getByPlaceholderText('2005'), {
      target: { value: '2020' },
    });

    fireEvent.click(screen.getByText('Seleccionar opción'));
    fireEvent.click(screen.getByRole('option', { name: 'AUTO' }));

    const fileInputs =
      container.querySelectorAll<HTMLInputElement>('input[type="file"]');

    expect(fileInputs).toHaveLength(2);

    fireEvent.change(fileInputs[0], {
      target: { files: [createPdfFile('padron.pdf')] },
    });

    fireEvent.change(fileInputs[1], {
      target: { files: [createPdfFile('permiso.pdf')] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(
        screen.getByText('RUT inválido: verificar dígito verificador'),
      ).toBeTruthy();
    });

    await waitFor(() => {
      expect(
        screen.getByText('Fecha de nacimiento: ingrese una fecha válida'),
      ).toBeTruthy();
    });
  });
});
