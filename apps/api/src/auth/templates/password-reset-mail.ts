import { SECONDS_PER_MINUTE } from '../../common/constants/index.js';
import type { SendMailInput } from '../../mail/index.js';

type PasswordResetMailInput = {
    resetUrl: string;
    expiresInSeconds: number;
    hasPassword: boolean;
};

export function createPasswordResetMail({
    resetUrl,
    expiresInSeconds,
    hasPassword,
}: PasswordResetMailInput): Pick<SendMailInput, 'subject' | 'text'> {
    const expiresInMinutes = expiresInSeconds / SECONDS_PER_MINUTE;
    const subject = hasPassword
        ? 'Reset your Ludora password'
        : 'Create your Ludora password';
    const requestDescription = hasPassword
        ? 'We received a request to reset the password for your Ludora account.'
        : 'We received a request to create a password for your Ludora account.';

    return {
        subject,
        text: [
            requestDescription,
            '',
            'Open this link to choose a new password:',
            resetUrl,
            '',
            `The link expires ${expiresInMinutes} minutes after it is generated and can only be used once.`,
            '',
            'If you did not request this email, you can ignore it.',
        ].join('\n'),
    };
}
