import 'vitest';

declare module 'vitest' {
  interface Assertion<R, T> {
    toHaveNoViolations(): R;
  }
}
