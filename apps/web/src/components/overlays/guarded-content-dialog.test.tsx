import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  NavigationGuardProvider,
  useUnsavedChanges,
} from '@/components/navigation';
import { Button } from '@/components/ui';
import esMessages from '@/messages/es.json';

import { ContentDialog, ContentDialogClose } from './content-dialog';
import { GuardedContentDialog } from './guarded-content-dialog';

function Editor() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  useUnsavedChanges(open && draft !== '');

  function save() {
    setDraft('');
    setOpen(false);
  }

  return (
    <GuardedContentDialog
      open={open}
      onOpenChange={setOpen}
      title={esMessages.Profile.edit}
      description={esMessages.Profile.description}
      trigger={<Button>{esMessages.Profile.edit}</Button>}
    >
      <label>
        {esMessages.Profile.bio.label}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <ContentDialogClose asChild>
        <Button>{esMessages.Common.actions.cancel}</Button>
      </ContentDialogClose>
      <Button onClick={save}>{esMessages.Common.actions.saveChanges}</Button>
    </GuardedContentDialog>
  );
}

function renderEditor() {
  render(
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <NavigationGuardProvider>
        <Editor />
      </NavigationGuardProvider>
    </NextIntlClientProvider>,
  );
  fireEvent.click(
    screen.getByRole('button', { name: esMessages.Profile.edit }),
  );
}

async function requestClose(method: string) {
  if (method === 'escape') {
    await userEvent.setup().keyboard('{Escape}');
    return;
  }

  const label =
    method === 'cancel'
      ? esMessages.Common.actions.cancel
      : esMessages.Common.actions.close;
  fireEvent.click(screen.getByRole('button', { name: label }));
}

afterEach(cleanup);

describe('GuardedContentDialog', () => {
  it.each(['cancel', 'close', 'escape'])(
    'closes a clean editor through %s without confirmation',
    async (method) => {
      renderEditor();
      await requestClose(method);

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.queryByRole('alertdialog')).toBeNull();
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: esMessages.Profile.edit }),
        ),
      );
    },
  );

  it.each(['cancel', 'close', 'escape'])(
    'confirms dirty editor closure through %s and preserves a cancelled draft',
    async (method) => {
      renderEditor();
      fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
        target: { value: 'Borrador pendiente' },
      });
      await requestClose(method);

      const confirmation = screen.getByRole('alertdialog', {
        name: esMessages.Common.unsavedChanges.title,
      });
      fireEvent.click(
        within(confirmation).getByRole('button', {
          name: esMessages.Common.unsavedChanges.cancel,
        }),
      );
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(
        screen.getByLabelText(esMessages.Profile.bio.label),
      ).toHaveProperty('value', 'Borrador pendiente');

      await requestClose(method);
      fireEvent.click(
        screen.getByRole('button', {
          name: esMessages.Common.unsavedChanges.confirm,
        }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.queryByRole('alertdialog')).toBeNull();
    },
  );

  it('allows a successful save to close directly without asking to discard', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Borrador guardado' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('ContentDialog', () => {
  it('shows informational content without a navigation guard provider', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ContentDialog
          open
          onOpenChange={() => {}}
          title={esMessages.Profile.title}
          description={esMessages.Profile.description}
        >
          <p>{esMessages.Profile.bio.empty}</p>
        </ContentDialog>
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole('dialog', { name: esMessages.Profile.title }),
    ).toBeTruthy();
    expect(screen.getByText(esMessages.Profile.bio.empty)).toBeTruthy();
  });
});
