import {
    type ArgumentsHost,
    Catch,
    HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

import { AUTH_ERRORS } from '../../auth/constants/auth-errors.js';
import { Prisma } from '../../generated/prisma/client.js';
import { DATABASE_CONSTRAINTS, PRISMA_ERROR_CODES } from '../constants/database.js';
import { DATABASE_ERRORS } from '../constants/database-errors.js';
import { HTTP_ERROR_NAMES } from '../constants/http.js';
import type { ApiErrorDefinition } from '../types/api-error-definition.js';

type PostgreSqlAdapterError = {
    cause?: {
        constraint?: {
            index?: unknown;
        };
    };
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter<unknown> {
    override catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ): void {
        if (exception.code !== PRISMA_ERROR_CODES.uniqueConstraintViolation) {
            super.catch(exception, host);
            return;
        }

        const driverAdapterError = exception.meta?.driverAdapterError as
            PostgreSqlAdapterError | undefined;
        const constraintName = driverAdapterError?.cause?.constraint?.index;
        let conflict: ApiErrorDefinition = DATABASE_ERRORS.uniqueConstraintViolation;

        if (constraintName === DATABASE_CONSTRAINTS.usersNicknameUnique) {
            conflict = AUTH_ERRORS.nicknameAlreadyExists;
        } else if (constraintName === DATABASE_CONSTRAINTS.usersEmailUnique) {
            conflict = AUTH_ERRORS.emailAlreadyExists;
        }

        const { message, errorCode } = conflict;
        const response = host.switchToHttp().getResponse<Response>();
        const status = HttpStatus.CONFLICT;

        response.status(status).json({
            statusCode: status,
            message,
            error: HTTP_ERROR_NAMES.conflict,
            errorCode,
        });
    }
}
