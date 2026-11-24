import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  const checkConnection = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: { checkConnection },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('checks the database before reporting a healthy service', async () => {
    await expect(appController.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
    expect(checkConnection).toHaveBeenCalledOnce();
  });
});
