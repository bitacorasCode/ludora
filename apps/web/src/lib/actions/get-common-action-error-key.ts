export function getCommonActionErrorKey(
    errorCode: string,
    messages: { has: (key: string) => boolean },
): string {
    return messages.has(errorCode) ? errorCode : 'unknown';
}
