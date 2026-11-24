import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { HTTP_REQUEST_ID_HEADER, isHttpRequestId } from '@ludora/contracts/http';
import type { NextFunction, Request, Response } from 'express';

import type { InternalRequestService } from '../services/internal-request.service.js';

export const API_OBSERVABILITY_EVENT = {
    request: 'http.request',
    dependency: 'dependency',
    refresh: 'auth.refresh',
} as const;

type ApiEvent = {
    event: (typeof API_OBSERVABILITY_EVENT)[keyof typeof API_OBSERVABILITY_EVENT];
} & Record<string, string | number | undefined>;

type RequestObservation = {
    requestId: string;
    databaseQueryCount: number;
    databaseDurationMs: number;
};

const requestObservation = new AsyncLocalStorage<RequestObservation>();

export function logApiEvent(event: ApiEvent): void {
    console.info(JSON.stringify({
        service: 'api',
        requestId: requestObservation.getStore()?.requestId,
        ...event,
    }));
}

export function recordDatabaseQuery(durationMs: number): void {
    const observation = requestObservation.getStore();

    if (!observation) return;

    observation.databaseQueryCount += 1;
    observation.databaseDurationMs += durationMs;
}

export async function measureDependency<T>(
    dependency: string,
    operation: string,
    run: () => Promise<T>,
): Promise<T> {
    const startedAt = performance.now();
    let outcome = 'error';

    try {
        const result = await run();
        outcome = 'success';
        return result;
    } finally {
        logApiEvent({
            event: API_OBSERVABILITY_EVENT.dependency,
            dependency,
            operation,
            outcome,
            durationMs: Math.round(performance.now() - startedAt),
        });
    }
}

export function createRequestObservabilityMiddleware(internalRequests: InternalRequestService) {
    return (request: Request, response: Response, next: NextFunction): void => {
        const startedAt = performance.now();
        const incomingId = request.headers[HTTP_REQUEST_ID_HEADER];
        const requestId = isHttpRequestId(incomingId) && internalRequests.isTrusted(request)
            ? incomingId
            : randomUUID();
        const observation: RequestObservation = {
            requestId,
            databaseQueryCount: 0,
            databaseDurationMs: 0,
        };

        response.setHeader(HTTP_REQUEST_ID_HEADER, requestId);
        response.once('close', () => {
            const route: { path?: unknown } | undefined = request.route;

            logApiEvent({
                event: API_OBSERVABILITY_EVENT.request,
                requestId,
                method: request.method,
                route: typeof route?.path === 'string' ? route.path : 'unmatched',
                statusCode: response.headersSent ? response.statusCode : undefined,
                outcome: response.writableFinished ? 'completed' : 'aborted',
                durationMs: Math.round(performance.now() - startedAt),
                databaseQueryCount: observation.databaseQueryCount,
                databaseDurationMs: Math.round(observation.databaseDurationMs),
            });
        });

        requestObservation.run(observation, next);
    };
}
