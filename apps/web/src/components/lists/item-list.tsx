import type { ReactNode } from 'react';

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
  Separator,
} from '@/components/ui';

export type ItemListEntry = {
  id: string;
  title: string;
  description?: string;
  descriptionId?: string;
  content: ReactNode;
};

type ItemListProps = {
  items: readonly ItemListEntry[];
  ariaLabel: string;
};

export function ItemList({ items, ariaLabel }: ItemListProps) {
  return (
    <FieldGroup>
      <ul aria-label={ariaLabel} className='space-y-5'>
        {items.map((item, index) => (
          <li key={item.id}>
            {index > 0 && <Separator className='mb-5' />}
            <Field orientation='responsive' aria-label={item.title}>
              <FieldContent>
                <FieldTitle>{item.title}</FieldTitle>
                {item.description !== undefined && (
                  <FieldDescription id={item.descriptionId}>
                    {item.description}
                  </FieldDescription>
                )}
              </FieldContent>
              <FieldContent className='@md/field-group:items-end'>
                {item.content}
              </FieldContent>
            </Field>
          </li>
        ))}
      </ul>
    </FieldGroup>
  );
}
