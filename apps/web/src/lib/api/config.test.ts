import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApiBaseUrl } from './config';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('API_URL', 'https://api.example.test');
});

afterEach(() => vi.unstubAllEnvs());

describe('API URL configuration', () => {
  it('accepts HTTPS in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getApiBaseUrl().origin).toBe('https://api.example.test');
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'accepts local HTTP on %s during development',
    (hostname) => {
      vi.stubEnv('API_URL', `http://${hostname}:3001`);
      expect(getApiBaseUrl().hostname).toBe(hostname);
    },
  );

  it('accepts local HTTP in tests', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('API_URL', 'http://localhost:3001');
    expect(getApiBaseUrl().protocol).toBe('http:');
  });

  it('rejects local HTTP in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('API_URL', 'http://localhost:3001');
    expect(getApiBaseUrl).toThrow('must use HTTPS');
  });

  it.each([
    'http://api.example.test',
    'http://localhost.example.test',
    'ftp://localhost',
  ])('rejects an insecure or unsupported URL: %s', (url) => {
    vi.stubEnv('API_URL', url);
    expect(getApiBaseUrl).toThrow('must use HTTPS');
  });

  it.each([
    'https://user:password@api.example.test',
    'http://user@localhost:3001',
  ])('rejects credentials in the URL: %s', (url) => {
    vi.stubEnv('API_URL', url);
    expect(getApiBaseUrl).toThrow('without credentials');
  });

  it('rejects a missing API_URL', () => {
    vi.stubEnv('API_URL', undefined);
    expect(getApiBaseUrl).toThrow('Missing API_URL');
  });

  it('rejects a malformed API_URL', () => {
    vi.stubEnv('API_URL', 'not-a-url');
    expect(getApiBaseUrl).toThrow();
  });
});
