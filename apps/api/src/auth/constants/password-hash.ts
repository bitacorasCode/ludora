import { argon2id, type HashOptions } from 'argon2';

export const PASSWORD_HASH_OPTIONS = {
    type: argon2id,
    // Argon2 expresses memoryCost in KiB: 19,456 KiB is 19 MiB.
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
} as const satisfies HashOptions;
