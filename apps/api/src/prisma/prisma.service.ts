import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { recordDatabaseQuery } from '../common/observability/request-observability.js';
import { type Prisma, PrismaClient } from '../generated/prisma/client.js';

const queryLogging = [{ level: 'query', emit: 'event' }] satisfies Prisma.LogDefinition[];
type PrismaOptions = Prisma.PrismaClientOptions & { log: typeof queryLogging };

@Injectable()
export class PrismaService extends PrismaClient<PrismaOptions> implements OnModuleInit, OnModuleDestroy {
    constructor(configService: ConfigService) {
        const connectionString = configService.getOrThrow<string>('DATABASE_URL');
        const adapter = new PrismaPg({ connectionString });

        super({ adapter, log: queryLogging });

        this.$on('query', ({ duration }) => recordDatabaseQuery(duration));
    }

    async checkConnection(): Promise<void> {
        await this.$queryRaw`SELECT 1`;
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
