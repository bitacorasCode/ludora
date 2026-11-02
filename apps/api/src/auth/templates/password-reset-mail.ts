import { SECONDS_PER_MINUTE } from '../../common/constants/time.js';
import type { SendMailInput } from '../../mail/index.js';

type PasswordResetMailInput = {
    resetUrl: string;
    expiresInSeconds: number;
};

export function createPasswordResetMail({
    resetUrl,
    expiresInSeconds,
}: PasswordResetMailInput): Pick<SendMailInput, 'subject' | 'text'> {
    const expiresInMinutes = expiresInSeconds / SECONDS_PER_MINUTE;

    return {
        subject: 'Reset your Ludora password',
        text: [
            'We received a request to reset the password for your Ludora account.',
            '',
            'Open this link to choose a new password:',
            resetUrl,
            '',
            `The link expires ${expiresInMinutes} minutes after it is generated and can only be used once.`,
            '',
            'If you did not request a password reset, you can ignore this email.',
        ].join('\n'),
    };
}
