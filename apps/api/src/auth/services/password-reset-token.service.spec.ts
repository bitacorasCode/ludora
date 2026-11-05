import { HEX_64_PATTERN } from '@ludora/security';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { PasswordResetTokenService } from './password-reset-token.service.js';

describe('PasswordResetTokenService', () => {
    let service: PasswordResetTokenService;
    const now = new Date('2026-11-04T12:00:00.000Z');

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(now);
        const module = await Test.createTestingModule({
            providers: [PasswordResetTokenService],
        }).compile();
        service = module.get(PasswordResetTokenService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('create', () => {
        it('should encode the configured number of random bytes as an unpadded URL-safe token', () => {
            const { token } = service.create();

            expect(token).toMatch(/^[A-Za-z0-9_-]+$/u);
            expect(token).not.toContain('=');
            expect(Buffer.from(token, PASSWORD_RESET_CONFIG.tokenEncoding)).toHaveLength(PASSWORD_RESET_CONFIG.tokenBytes);
        });

        it('should return the token hash rather than repeating its plaintext credential', () => {
            const { token, tokenHash } = service.create();

            expect(tokenHash).toMatch(HEX_64_PATTERN);
            expect(tokenHash).toBe(service.hash(token));
            expect(tokenHash).not.toBe(token);
        });

        it('should calculate expiration from the configured lifetime in seconds', () => {
            const { expiresAt } = service.create();

            expect(expiresAt).toEqual(new Date(
                now.getTime() + PASSWORD_RESET_CONFIG.expiresInSeconds * MILLISECONDS_PER_SECOND,
            ));
        });

        it('should create independent credentials for separate requests', () => {
            const first = service.create();
            const second = service.create();

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
