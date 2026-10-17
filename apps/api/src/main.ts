import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableShutdownHooks();

    app.useGlobalPipes(new StandardSchemaValidationPipe());

    app.useGlobalFilters(new PrismaExceptionFilter(app.getHttpAdapter()));

    await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
