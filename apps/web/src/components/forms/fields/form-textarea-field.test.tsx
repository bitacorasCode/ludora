import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vitest';

import { FormTextareaField } from './form-textarea-field';

function TestForm({
  counter = true,
  invalid = false,
  initialValue = '',
}: {
  counter?: boolean;
  invalid?: boolean;
  initialValue?: string | null;
}) {
  const form = useForm<{ bio: string | null }>({
    defaultValues: { bio: initialValue },
  });
  return (
    <>
      <FormTextareaField
        control={form.control}
        name='bio'
        label='Biography'
        maxLength={5}
        formatCounter={
          counter ? (count, max) => `${count}/${max} characters` : undefined
        }
      />
      {invalid && (
        <button
          type='button'
          onClick={() =>
            form.setError('bio', { message: 'Invalid biography' })
          }
        >
          Validate
        </button>
      )}
    </>
  );
}

afterEach(() => {
  cleanup();
});

describe('FormTextareaField integration', () => {
  it('updates its counter and enforces the native character limit', async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    const input = screen.getByRole('textbox', {
      name: 'Biography',
    }) as HTMLTextAreaElement;
    expect(screen.getByText('0/5 characters')).toBeTruthy();
    await user.type(input, 'abcdef');
    expect(input.value).toBe('abcde');
    expect(screen.getByText('5/5 characters')).toBeTruthy();
    expect(
      document.getElementById(input.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('5/5 characters');
  });

  it('associates both the counter and validation error with the field', () => {
    render(<TestForm invalid />);
    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    const input = screen.getByLabelText('Biography');
    const descriptions = input
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(descriptions).toEqual(['0/5 characters', 'Invalid biography']);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Invalid biography');
  });

  it('supports null values without a counter or a dangling description', () => {
    render(<TestForm counter={false} initialValue={null} />);
    const input = screen.getByLabelText('Biography') as HTMLTextAreaElement;
    expect(input.value).toBe('');
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(screen.queryByText('0/5 characters')).toBeNull();
  });
});
