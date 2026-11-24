import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/index.js';
import type { ChangePasswordDto } from '../dto/index.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { AuthSessionService } from './auth-session.service.js';
import { PasswordService } from './password.service.js';
import { PasswordNotificationService } from './password-notification.service.js';

@Injectable()
export class PasswordChangeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly resetRepository: PasswordResetRepository,
        private readonly authSessionService: AuthSessionService,
        private readonly passwordNotificationService: PasswordNotificationService,
    ) { }

    async changePassword(
        userId: string,
        expectedAuthVersion: number,
        { currentPassword, password, expectedUserId }: ChangePasswordDto,
    ) {
        if (expectedUserId !== userId) {
            const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

            throw new UnauthorizedException(message, { errorCode });
        }

        const user = await this.usersService.findPasswordById(userId);

        if (!user?.emailVerifiedAt || user.authVersion !== expectedAuthVersion) {
            const { message, errorCode } = AUTH_ERRORS.invalidToken;
            throw new UnauthorizedException(message, { errorCode });
        }

        const { passwordHash: currentPasswordHash } = user;

        if (
            currentPasswordHash === null
            || !(await this.passwordService.verify(
                currentPasswordHash,
                currentPassword,
            ))
        ) {
            const { message, errorCode } = AUTH_ERRORS.currentPasswordInvalid;

            throw new BadRequestException(message, { errorCode });
        }

        if (password === currentPassword) {
            const { message, errorCode } = AUTH_ERRORS.passwordUnchanged;
            throw new BadRequestException(message, { errorCode });
        }

        const passwordHash = await this.passwordService.hash(password);

        return this.prisma.$transaction(async (transaction) => {
            // Match recovery's lock order: reset rows first, then the user row.
            await this.resetRepository.deleteForUser(userId, transaction);
            const changed = await this.usersService.changePasswordIfCurrent({
                userId,
                passwordHash,
                expectedPasswordHash: currentPasswordHash,
                expectedAuthVersion,
            }, transaction);

            if (!changed) {
                const { message, errorCode } = AUTH_ERRORS.invalidToken;
                throw new UnauthorizedException(message, { errorCode });
            }

            const updated = await this.usersService.findAuthenticationById(userId, transaction);

            if (!updated?.emailVerifiedAt) {
                const { message, errorCode } = AUTH_ERRORS.invalidToken;
                throw new UnauthorizedException(message, { errorCode });
            }

            await this.passwordNotificationService.enqueuePasswordChanged(userId, false, transaction);
            return this.authSessionService.create(updated, transaction);
        });
    }
}
