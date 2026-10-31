import { isIP } from 'node:net';

const INVALID_IP_RESULT = 0;

export function isValidIp(value) {
    return typeof value === 'string'
        && isIP(value) !== INVALID_IP_RESULT;
}