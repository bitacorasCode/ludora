import { z } from 'zod';

export const passwordResetTokenSchema = z.base64url().min(1);
