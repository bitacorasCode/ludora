import 'vitest';

declare module 'vitest' {
  interface Assertion<R, T> {
    toHaveNoViolations(this: Assertion<R, T>): R;
  }
}
