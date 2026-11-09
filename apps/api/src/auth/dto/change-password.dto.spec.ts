import { AUTH_VALIDATION } from '@ludora/security';

import { changePasswordSchema } from './change-password.dto.js';

describe('changePasswordSchema', () => {
    const data = { currentPassword: 'CurrentPassword123!', password: 'NewPassword123!' };

    it('should accept only the current and new passwords', () => {
        expect(changePasswordSchema.parse(data)).toEqual(data);
    });

    it.each([
        { ...data, currentPassword: '' },
        { password: data.password },
        { ...data, password: 'x'.repeat(AUTH_VALIDATION.passwordMinLength - 1) },
        { currentPassword: data.currentPassword },
        { ...data, email: 'changed@example.com' },
        { ...data, userId: 'another-user' },
        { ...data, confirmPassword: data.password },
    ])('should reject malformed or unexpected fields: %j', (invalid) => {
        expect(changePasswordSchema.safeParse(invalid).success).toBe(false);
    });
});
