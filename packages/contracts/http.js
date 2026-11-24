export const HTTP_REQUEST_ID_HEADER = 'x-ludora-request-id';

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isHttpRequestId(value) {
    return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}
