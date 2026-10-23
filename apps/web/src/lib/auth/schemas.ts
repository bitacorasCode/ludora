import 'server-only';

import { z } from 'zod';

export const authResponseSchema = z.object({
    accessToken: z.string().min(1),
});
