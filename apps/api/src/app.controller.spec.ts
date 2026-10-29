import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersService } from './users/users.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: UsersService,
          useValue: { count: vi.fn().mockResolvedValue(0) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
