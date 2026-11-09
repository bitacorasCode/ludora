import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';

import { isAuthenticationError } from './is-authentication-error';

describe('isAuthenticationError', () => {
  it('recognizes missing authentication even without an HTTP status', () => {
    expect(isAuthenticationError({
      errorCode: API_ERROR_CODES.authenticationRequired,
    })).toBe(true);
  });

  it('recognizes an invalid or expired token through its HTTP status', () => {
    expect(isAuthenticationError({
      errorCode: 'AUTH_INVALID_TOKEN',
      statusCode: HTTP_STATUS.unauthorized,
    })).toBe(true);
  });

  it.each([null, undefined])('accepts an absent error: %s', (error) => {
    expect(isAuthenticationError(error)).toBe(false);
  });

  it.each([
    { errorCode: API_ERROR_CODES.unavailable, statusCode: HTTP_STATUS.serviceUnavailable },
    { errorCode: 'RATE_LIMIT_EXCEEDED', statusCode: HTTP_STATUS.tooManyRequests },
    { errorCode: 'ACTION_VALIDATION_FAILED', statusCode: HTTP_STATUS.badRequest },
    { errorCode: 'UNKNOWN_ERROR' },
  ])('does not interpret $errorCode as an expired session', (error) => {
    expect(isAuthenticationError(error)).toBe(false);
  });
});
