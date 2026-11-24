import { normalizeEmail } from '@ludora/contracts/auth';
import { z } from 'zod';

export const emailSchema = z
    .string()
    .overwrite(normalizeEmail)
    .pipe(z.email());
