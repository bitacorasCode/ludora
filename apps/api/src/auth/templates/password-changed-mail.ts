import type { SendMailInput } from '../../mail/index.js';

export function createPasswordChangedMail(): Pick<SendMailInput, 'subject' | 'text'> {
    return {
        subject: 'Your Ludora password has been changed',
        text: [
            'The password for your Ludora account has been changed.',
            '',
            'Your previous sessions are no longer valid.',
            'Sign in again using your new password.',
            '',
            'If you did not make this change, open Ludora and request a new password reset immediately.',
        ].join('\n'),
    };
}
