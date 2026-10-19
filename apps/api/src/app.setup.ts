import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { AppConfig } from './common/config/app-config.js';
import { operationIdMiddleware } from './common/logging/operation-id.middleware.js';
import { ProblemDetailsFilter } from './common/problem-details/problem-details.filter.js';
import { WEBHOOK_BODY_LIMIT } from './entitlements/entitlements.constants.js';

export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.use(operationIdMiddleware);
  // Webhooks verify signatures on the exact bytes (R16): read them raw, before the JSON parser, which then skips the request.
  app.useBodyParser('raw', {
    type: (req: { url?: string }) => req.url?.startsWith('/v1/billing/webhooks/') ?? false,
    limit: WEBHOOK_BODY_LIMIT,
  });
  app.useBodyParser('json', { limit: '100kb' });
  app.use(cookieParser());
  app.set('trust proxy', config.trustProxy);
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection', 'Idempotency-Key'],
    exposedHeaders: ['Retry-After'],
  });
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ProblemDetailsFilter(config.problemTypeBase));
  app.useGlobalPipes(new StandardSchemaValidationPipe());
}
