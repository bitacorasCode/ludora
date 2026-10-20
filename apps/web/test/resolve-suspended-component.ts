import type { ReactElement, ReactNode } from 'react';

// Resolve the async guard directly. Playwright covers Next's actual streaming.
export async function resolveSuspendedComponent<TProps>(
  element: ReactElement<{
    children: ReactElement<TProps, (props: TProps) => Promise<ReactNode>>;
  }>,
): Promise<ReactNode> {
  const { type: Component, props } = element.props.children;
  return Component(props);
}
