import type { SendMailInput } from '../../mail/index.js';

export function createPasswordChangedMail(isFirstPassword = false): Pick<SendMailInput, 'subject' | 'text'> {
    const action = isFirstPassword ? 'created' : 'changed';
    const signInInstructions = isFirstPassword
        ? 'Sign in with your email and password, or continue using your existing sign-in method.'
        : 'Use your new password the next time you sign in.';

    return {
        subject: `Your Ludora password has been ${action}`,
        text: [
            `The password for your Ludora account has been ${action}.`,
            '',
            'Your previous sessions are no longer valid.',
            signInInstructions,
            '',
            'If you did not make this change, open Ludora and request a new password reset immediately.',
        ].join('\n'),
    };
}
