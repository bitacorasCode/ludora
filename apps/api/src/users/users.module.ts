import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersRepository } from './repositories/index.js';
import { UsersService } from './users.service.js';

@Module({
    imports: [PrismaModule],
    providers: [UsersRepository, UsersService],
    exports: [UsersService],
})
export class UsersModule { }
