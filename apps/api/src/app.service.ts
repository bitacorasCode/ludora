import { Injectable } from '@nestjs/common';

import { UsersService } from './users/users.service.js';

@Injectable()
export class AppService {
    constructor(private readonly usersService: UsersService) { }

    getHello(): string {
        return 'Hello World!';
    }

    async getHealth() {
        const usersCount = await this.usersService.count();

        return {
            status: 'ok',
            database: 'connected',
            usersCount,
        };
    }
}
