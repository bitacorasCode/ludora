import { SECONDS_PER_MINUTE } from '../../common/constants/time.js';
import type { SendMailInput } from '../../mail/index.js';

type EmailVerificationMailInput = {
    code: string;
    expiresInSeconds: number;
};

export function createEmailVerificationMail({
    code,
    expiresInSeconds,
}: EmailVerificationMailInput): Pick<SendMailInput, 'subject' | 'text'> {
    const expiresInMinutes = expiresInSeconds / SECONDS_PER_MINUTE;

    return {
        subject: 'Verify your email address for Ludora',
        text: [
            'You are one step away from completing your Ludora registration.',
            '',
            `Your verification code is: ${code}`,
            '',
            `The code expires ${expiresInMinutes} minutes after it is generated.`,
            'Enter it on the Ludora email verification page.',
            '',
            'If you did not request this registration, you can ignore this email.',
        ].join('\n'),
    };
}
