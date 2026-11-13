import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { getSessionToken } from '@/lib/session';

import { authenticatedApi, publicApi } from './api-client';
import { apiRequest } from './api-request';
import { API_ERROR_CODES } from './constants';

vi.mock('@/lib/session', () => ({ getSessionToken: vi.fn() }));
vi.mock('./api-request', () => ({ apiRequest: vi.fn() }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('INTERNAL_API_SECRET', 'a'.repeat(64));
    vi.mocked(apiRequest).mockResolvedValue({
        status: OPERATION_STATUS.success,
        data: {},
    });
    vi.mocked(getSessionToken).mockResolvedValue('test-token');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('API clients', () => {
    it('does not read a session for public requests', async () => {
        await publicApi.post('/auth/login', {
            email: 'jugador@example.test',
            password: 'password123',
        });
        expect(getSessionToken).not.toHaveBeenCalled();
        const options = vi.mocked(apiRequest).mock.calls[0][1]!;
        expect(new Headers(options.headers).get('authorization')).toBeNull();
        expect(new Headers(options.headers).get('content-type')).toBe(
            'application/json',
        );
        expect(options.cache).toBe('no-store');
    });

    it('adds the cookie token as a bearer header for authenticated requests', async () => {
        await authenticatedApi.get('/auth/me');
        const options = vi.mocked(apiRequest).mock.calls[0][1]!;
        expect(new Headers(options.headers).get('authorization')).toBe(
            'Bearer test-token',
        );
        expect(options.cache).toBe('no-store');
    });

    it('returns an authentication error without contacting the API if no cookie exists', async () => {
        vi.mocked(getSessionToken).mockResolvedValue(undefined);
        expect(await authenticatedApi.get('/auth/me')).toEqual({
            status: OPERATION_STATUS.error,
            error: { errorCode: API_ERROR_CODES.authenticationRequired },
        });
        expect(apiRequest).not.toHaveBeenCalled();
    });

    it.each(['authorization', 'cookie', 'host', 'proxy-authorization'])(
        'rejects an attempt to override the reserved %s header',
        async (name) => {
            expect(
                await authenticatedApi.get('/auth/me', {
                    headers: { [name]: 'override' },
                }),
            ).toEqual({
                status: OPERATION_STATUS.error,
                error: { errorCode: API_ERROR_CODES.invalidRequest },
            });
            expect(apiRequest).not.toHaveBeenCalled();
        },
    );

    it('reads the session separately for each request', async () => {
        vi.mocked(getSessionToken)
            .mockResolvedValueOnce('first-token')
            .mockResolvedValueOnce('second-token');
        await authenticatedApi.get('/auth/me');
        await authenticatedApi.get('/auth/me');
        expect(
            vi
                .mocked(apiRequest)
                .mock.calls.map(([, options]) =>
                    new Headers(options?.headers).get('authorization'),
                ),
        ).toEqual(['Bearer first-token', 'Bearer second-token']);
    });

    it.each([false, 0, '', null])(
        'serializes the valid JSON payload %j',
        async (body) => {
            await publicApi.post('/payload', body);

            const options = vi.mocked(apiRequest).mock.calls[0][1]!;
            expect(options.body).toBe(JSON.stringify(body));
            expect(new Headers(options.headers).get('content-type')).toBe(
                'application/json',
            );
        },
    );

    it.each([Symbol('unsupported'), () => 'unsupported', BigInt(1)])(
        'rejects payloads that cannot be serialized as JSON',
        async (body) => {
            expect(await publicApi.post('/payload', body)).toEqual({
                status: OPERATION_STATUS.error,
                error: { errorCode: API_ERROR_CODES.invalidRequest },
            });
            expect(apiRequest).not.toHaveBeenCalled();
        },
    );
});
