import { HEX_64_PATTERN } from '@ludora/security';
import { ConfigService } from '@nestjs/config';

import { OPAQUE_TOKEN_ENCODED_LENGTH } from '../utils/opaque-token.js';
import { PasswordResetTokenService } from './password-reset-token.service.js';

describe('PasswordResetTokenService', () => {
    const jobId = 'd56aa89f-ac5f-4d65-a49d-3653442080bf';
    const service = new PasswordResetTokenService(new ConfigService({ JWT_SECRET: 'fixture-signing-key' }));

    describe('createForJob', () => {
        it('should return an unpadded URL-safe token of the configured length', () => {
            const { token } = service.createForJob(jobId);

            expect(token).toMatch(/^[A-Za-z0-9_-]+$/u);
            expect(token).not.toContain('=');
            expect(token).toHaveLength(OPAQUE_TOKEN_ENCODED_LENGTH);
        });

        it('should return the token hash rather than repeating its plaintext credential', () => {
            const { token, tokenHash } = service.createForJob(jobId);

            expect(tokenHash).toMatch(HEX_64_PATTERN);
            expect(tokenHash).toBe(service.hash(token));
            expect(tokenHash).not.toBe(token);
        });

        it('recreates the same credential when a new worker retries the same job', () => {
            const afterRestart = new PasswordResetTokenService(
                new ConfigService({ JWT_SECRET: 'fixture-signing-key' }),
            );

            expect(afterRestart.createForJob(jobId)).toEqual(service.createForJob(jobId));
        });

        it('should create independent credentials for separate requests', () => {
            const first = service.createForJob(jobId);
            const second = service.createForJob('7bfb13db-5c4f-4687-bf0f-1ca932d86152');

            expect(second.token).not.toBe(first.token);
            expect(second.tokenHash).not.toBe(first.tokenHash);
        });
    });

    describe('hash', () => {
        it('should match the SHA-256 hexadecimal test vector', () => {
            expect(service.hash('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
            expect(service.hash('temporary-token')).toBe(service.hash('temporary-token'));
            expect(service.hash('different-token')).not.toBe(service.hash('temporary-token'));
        });
    });
});
