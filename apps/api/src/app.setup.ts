import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { AppConfig } from './common/config/app-config.js';
import { operationIdMiddleware } from './common/logging/operation-id.middleware.js';
import { ProblemDetailsFilter } from './common/problem-details/problem-details.filter.js';

export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.use(operationIdMiddleware);
  app.useBodyParser('json', { limit: '100kb' });
  app.use(cookieParser());
  app.set('trust proxy', config.trustProxy);
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection'],
  });
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ProblemDetailsFilter(config.problemTypeBase));
  app.useGlobalPipes(new StandardSchemaValidationPipe());
}
