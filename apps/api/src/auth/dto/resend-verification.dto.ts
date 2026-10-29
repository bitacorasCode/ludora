import { z } from 'zod';

export const resendVerificationSchema = z.strictObject({
    verificationId: z.uuid(),
});

export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
