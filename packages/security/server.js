import { isIP } from 'node:net';

const INVALID_IP_RESULT = 0;
const HTTP_PROTOCOL = {
    secure: 'https:',
    insecure: 'http:',
};
const LOCAL_HTTP_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const LOCAL_HTTP_ENVIRONMENTS = ['development', 'test'];

export function isValidIp(value) {
    return typeof value === 'string'
        && isIP(value) !== INVALID_IP_RESULT;
}

export function parseHttpUrl(value, nodeEnvironment) {
    if (typeof value !== 'string' || !value) return null;

    let url;

    try {
        url = new URL(value);
    } catch {
        return null;
    }

    const isHttps = url.protocol === HTTP_PROTOCOL.secure;
    const isLocalHttp = LOCAL_HTTP_ENVIRONMENTS.includes(nodeEnvironment)
        && url.protocol === HTTP_PROTOCOL.insecure
        && LOCAL_HTTP_HOSTS.includes(url.hostname);

    if ((!isHttps && !isLocalHttp) || url.username || url.password) return null;

    return url;
}
