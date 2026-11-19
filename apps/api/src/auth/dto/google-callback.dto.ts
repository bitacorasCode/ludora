import { z } from 'zod';

export const googleCallbackSchema = z.strictObject({
    flowToken: z.string().min(1),
    responseParameters: z.string().min(1),
});

export type GoogleCallbackDto = z.infer<typeof googleCallbackSchema>;
