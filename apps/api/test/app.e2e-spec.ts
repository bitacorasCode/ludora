import { randomUUID } from 'node:crypto';

import { HTTP_REQUEST_ID_HEADER, isHttpRequestId } from '@ludora/contracts/http';
import { INTERNAL_REQUEST_HEADERS } from '@ludora/security';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { createRequestObservabilityMiddleware } from '../src/common/observability/request-observability.js';
import { InternalRequestService } from '../src/common/services/index.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(createRequestObservabilityMiddleware(app.get(InternalRequestService)));
    await app.init();
  });

  it('returns 404 for GET / and replaces an untrusted request ID', async () => {
    const requestId = randomUUID();
    const response = await request(app.getHttpServer())
      .get('/')
      .set(HTTP_REQUEST_ID_HEADER, requestId)
      .expect(404);

    expect(isHttpRequestId(response.headers[HTTP_REQUEST_ID_HEADER])).toBe(true);
    expect(response.headers[HTTP_REQUEST_ID_HEADER]).not.toBe(requestId);
  });

  it('/health (GET) checks connectivity without returning user data', () => {
    const requestId = randomUUID();
    const internalSecret = app.get(ConfigService).getOrThrow<string>('INTERNAL_API_SECRET');

    return request(app.getHttpServer())
      .get('/health')
      .set(HTTP_REQUEST_ID_HEADER, requestId)
      .set(INTERNAL_REQUEST_HEADERS.secret, internalSecret)
      .expect(200)
      .expect(HTTP_REQUEST_ID_HEADER, requestId)
      .expect({ status: 'ok', database: 'connected' });
  });

  afterEach(async () => {
    await app.close();
  });
});
