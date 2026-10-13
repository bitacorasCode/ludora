'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { UserRegistrationFormData, userRegistrationSchema } from '@/lib/schemas/user-registration/user-registration';

export type RegisterResult = {
    errors: string[];
};

export async function registerUser(formData: UserRegistrationFormData): Promise<RegisterResult | never> {
    const result = userRegistrationSchema.safeParse(formData);

    if (!result.success) {
        return {
            errors: z.treeifyError(result.error).errors,
        };
    }

    const cookieStore = await cookies();

    cookieStore.set('registration-success', 'true', {
        maxAge: 10,
        path: '/',
    });

    redirect('/register/success');
}
