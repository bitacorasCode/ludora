import {
    HttpException,
    type HttpExceptionOptions,
    HttpStatus,
} from '@nestjs/common';

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
                    'Too Many Requests',
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
