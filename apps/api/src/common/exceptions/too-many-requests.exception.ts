import {
    HttpException,
    type HttpExceptionOptions,
    HttpStatus,
} from '@nestjs/common';

import { HTTP_ERROR_NAMES } from '../constants/http.js';

type TooManyRequestsOptions = HttpExceptionOptions & {
    retryAfterSeconds?: number;
};

export class TooManyRequestsException extends HttpException {
    constructor(message: string, options: TooManyRequestsOptions = {}) {
        const { retryAfterSeconds, ...httpOptions } = options;
        const status = HttpStatus.TOO_MANY_REQUESTS;

        super(
            {
                ...HttpException.createBody(
                    message,
                    HTTP_ERROR_NAMES.tooManyRequests,
                    status,
                    httpOptions.errorCode,
                ),
                ...(retryAfterSeconds !== undefined && { retryAfterSeconds }),
            },
            status,
            httpOptions,
        );
    }
}
