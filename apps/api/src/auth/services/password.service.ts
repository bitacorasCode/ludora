import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PASSWORD_HASH_OPTIONS } from '../constants/password-hash.js';

@Injectable()
export class PasswordService {
    hash(password: string): Promise<string> {
        return argon2.hash(password, PASSWORD_HASH_OPTIONS);
    }

    verify(passwordHash: string, password: string): Promise<boolean> {
        return argon2.verify(passwordHash, password);
    }
}
