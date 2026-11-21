import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
    constructor(private readonly prisma: PrismaService) { }

    getHello(): string {
        return 'Hello World!';
    }

    async getHealth() {
        await this.prisma.checkConnection();

        return {
            status: 'ok',
            database: 'connected',
        };
    }
}
