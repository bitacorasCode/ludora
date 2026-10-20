import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, authenticatedApi, HTTP_STATUS } from '@/lib/api';

import { currentUser } from '../../../test/fixtures/current-user';
import { getCurrentUser } from './get-current-user';

vi.mock('@/lib/api', async () => ({
  ...(await import('@/lib/api/constants')),
  authenticatedApi: { get: vi.fn() },
}));

beforeEach(() => vi.mocked(authenticatedApi.get).mockReset());

describe('getCurrentUser', () => {
  it('returns the validated current user', async () => {
    vi.mocked(authenticatedApi.get).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { user: currentUser },
    });
    expect(await getCurrentUser()).toEqual(currentUser);
    expect(authenticatedApi.get).toHaveBeenCalledExactlyOnceWith('/auth/me');
  });

  it('returns null when no token is available', async () => {
    vi.mocked(authenticatedApi.get).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.authenticationRequired },
    });
    expect(await getCurrentUser()).toBeNull();
  });

  it('returns null for an invalid or expired token', async () => {
    vi.mocked(authenticatedApi.get).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'AUTH_INVALID_TOKEN',
        statusCode: HTTP_STATUS.unauthorized,
      },
    });
    expect(await getCurrentUser()).toBeNull();
  });

  it('throws for an unavailable API instead of treating it as a guest', async () => {
    vi.mocked(authenticatedApi.get).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
    await expect(getCurrentUser()).rejects.toThrow(API_ERROR_CODES.unavailable);
  });

  it('rejects a malformed user response', async () => {
    vi.mocked(authenticatedApi.get).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { user: { ...currentUser, id: 'invalid' } },
    });
    await expect(getCurrentUser()).rejects.toThrow(
      API_ERROR_CODES.invalidResponse,
    );
  });
});
