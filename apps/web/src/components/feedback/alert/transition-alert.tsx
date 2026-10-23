import type { ComponentProps } from 'react';

import { Alert } from './alert';

type TransitionAlertProps = ComponentProps<typeof Alert> & {
  open: boolean;
};

export function TransitionAlert({ open, ...props }: TransitionAlertProps) {
  return (
    <div
      data-slot='transition-alert'
      data-state={open ? 'open' : 'closed'}
      aria-hidden={!open}
      className='grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-in-out data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100 motion-reduce:transition-none'
    >
      <div className='min-h-0 overflow-hidden'>
        <div className='pt-4 [&>[data-slot=alert]]:mb-0'>
          <Alert {...props} />
        </div>
      </div>
    </div>
  );
}
