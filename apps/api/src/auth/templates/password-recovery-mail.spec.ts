import { SECONDS_PER_MINUTE } from '../../common/constants/time.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { createPasswordChangedMail } from './password-changed-mail.js';
import { createPasswordResetMail } from './password-reset-mail.js';

describe('createPasswordResetMail', () => {
    const resetUrl = 'https://ludora.example/reset-password?token=temporary-token';

    it('should create an English message containing the supplied recovery link', () => {
        const mail = createPasswordResetMail({ resetUrl, expiresInSeconds: PASSWORD_RESET_CONFIG.expiresInSeconds });

        expect(mail.subject).toBe('Reset your Ludora password');
        expect(mail.text).toContain('We received a request to reset the password for your Ludora account.');
        expect(mail.text.split('\n')).toContain(resetUrl);
        expect(Object.keys(mail).sort()).toEqual(['subject', 'text']);
    });

    it('should state the configured expiration in minutes and one-time use', () => {
        const { expiresInSeconds } = PASSWORD_RESET_CONFIG;
        const { text } = createPasswordResetMail({ resetUrl, expiresInSeconds });

        expect(text).toContain(`The link expires ${expiresInSeconds / SECONDS_PER_MINUTE} minutes after it is generated and can only be used once.`);
    });

    it('should explain that an unrequested recovery email can be ignored', () => {
        const { text } = createPasswordResetMail({ resetUrl, expiresInSeconds: PASSWORD_RESET_CONFIG.expiresInSeconds });

        expect(text).toContain('If you did not request a password reset, you can ignore this email.');
    });
});

describe('createPasswordChangedMail', () => {
    it('should confirm the change and explain that a new login is required', () => {
        const mail = createPasswordChangedMail();

        expect(mail.subject).toBe('Your Ludora password has been changed');
        expect(mail.text).toContain('The password for your Ludora account has been changed.');
        expect(mail.text).toContain('Your previous sessions are no longer valid.');
        expect(mail.text).toContain('Sign in again using your new password.');
        expect(Object.keys(mail).sort()).toEqual(['subject', 'text']);
    });

    it('should explain how to react to an unrecognized change without including a recovery link', () => {
        const { text } = createPasswordChangedMail();

        expect(text).toContain('If you did not make this change, open Ludora and request a new password reset immediately.');
        expect(text).not.toMatch(/https?:\/\//u);
        expect(text).not.toContain('token=');
    });
});
