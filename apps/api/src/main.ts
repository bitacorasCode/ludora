import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableShutdownHooks();

    app.useGlobalPipes(new StandardSchemaValidationPipe());

    await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
