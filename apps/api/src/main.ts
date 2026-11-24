import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { createRequestObservabilityMiddleware } from './common/observability/request-observability.js';
import { InternalRequestService } from './common/services/index.js';

const DEFAULT_API_PORT = 3001;

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableShutdownHooks();

    app.use(createRequestObservabilityMiddleware(app.get(InternalRequestService)));

    app.useGlobalPipes(new StandardSchemaValidationPipe());

    app.useGlobalFilters(new PrismaExceptionFilter(app.getHttpAdapter()));

    await app.listen(process.env.PORT ?? DEFAULT_API_PORT);
}

await bootstrap();
