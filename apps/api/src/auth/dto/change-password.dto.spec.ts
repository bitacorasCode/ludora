import { AUTH_VALIDATION } from '@ludora/contracts/auth';

import { changePasswordSchema } from './change-password.dto.js';

describe('changePasswordSchema', () => {
    const data = {
        currentPassword: 'CurrentPassword123!',
        password: 'NewPassword123!',
        expectedUserId: 'a0db3414-7659-46ee-8435-1a32f52b1f26',
    };

    it('accepts the current and new passwords with the expected account ID', () => {
        expect(changePasswordSchema.parse(data)).toEqual(data);
    });

    it.each([
        { ...data, currentPassword: '' },
        { password: data.password },
        { ...data, password: 'x'.repeat(AUTH_VALIDATION.passwordMinLength - 1) },
        { currentPassword: data.currentPassword },
        { ...data, email: 'changed@example.com' },
        { ...data, userId: 'another-user' },
        { ...data, expectedUserId: undefined },
        { ...data, expectedUserId: 'not-a-uuid' },
        { ...data, confirmPassword: data.password },
    ])('should reject malformed or unexpected fields: %j', (invalid) => {
        expect(changePasswordSchema.safeParse(invalid).success).toBe(false);
    });
});
