import 'server-only';

const LOCAL_API_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const;

export function getApiBaseUrl(): URL {
  const { API_URL, NODE_ENV } = process.env;

  if (!API_URL) {
    throw new Error('Missing API_URL environment variable.');
  }

  const baseUrl = new URL(API_URL);
  const isHttps = baseUrl.protocol === 'https:';
  const isLocalHttp =
    (NODE_ENV === 'development' || NODE_ENV === 'test') &&
    baseUrl.protocol === 'http:' &&
    LOCAL_API_HOSTS.some((hostname) => hostname === baseUrl.hostname);

  if ((!isHttps && !isLocalHttp) || baseUrl.username || baseUrl.password) {
    throw new Error(
      'API_URL must use HTTPS without credentials. HTTP is only allowed for loopback hosts in development or tests.',
    );
  }

  return baseUrl;
}
