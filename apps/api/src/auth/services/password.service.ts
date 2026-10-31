import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const PASSWORD_HASH_OPTIONS = {
    type: argon2.argon2id,
    // Argon2 expresses memoryCost in KiB: 19,456 KiB is 19 MiB.
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
} as const satisfies argon2.HashOptions;

@Injectable()
export class PasswordService {
    hash(password: string): Promise<string> {
        return argon2.hash(password, PASSWORD_HASH_OPTIONS);
    }

    verify(passwordHash: string, password: string): Promise<boolean> {
        return argon2.verify(passwordHash, password);
    }
}
