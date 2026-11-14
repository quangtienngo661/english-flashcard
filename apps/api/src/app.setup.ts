import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { AppConfig } from './common/config/app-config.js';
import { AppLogger } from './common/logging/app-logger.js';
import { operationIdMiddleware } from './common/logging/operation-id.middleware.js';
import { ProblemDetailsFilter } from './common/problem-details/problem-details.filter.js';
import { WEBHOOK_BODY_LIMIT } from './entitlements/entitlements.constants.js';

const BULK_EXAMPLES_BODY_LIMIT = '2mb';

export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.use(operationIdMiddleware);
  // Header set for a JSON API (launch prep A, design 4.4): helmet's defaults suit HTML pages, so every default is off or replaced.
  // HSTS comes from the API itself: api. and admin-api. point straight at the VPS (Q6, no Cloudflare proxy), so no edge adds it.
  // Cross-Origin-Resource-Policy `same-site` still lets the web and admin hosts under wordmet.com read responses (CORS decides the rest).
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { 'default-src': ["'none'"], 'frame-ancestors': ["'none'"] } },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true, preload: false },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    xDnsPrefetchControl: false,
    xDownloadOptions: false,
    xFrameOptions: false,
    xPermittedCrossDomainPolicies: false,
    xXssProtection: false,
  }));
  // Webhooks verify signatures on the exact bytes (R16): read them raw, before the JSON parser, which then skips the request.
  app.useBodyParser('raw', {
    type: (req: { url?: string }) => req.url?.startsWith('/v1/billing/webhooks/') ?? false,
    limit: WEBHOOK_BODY_LIMIT,
  });
  // A bulk of example rows (up to 1000) is bigger than any other body: this route reads JSON first with a larger limit, and the
  // general parser below then skips the request.
  app.useBodyParser('json', {
    limit: BULK_EXAMPLES_BODY_LIMIT,
    type: (req: { url?: string; headers: Record<string, string | string[] | undefined> }) =>
      (req.url?.split('?')[0] === '/v1/admin/ai/eval/examples/bulk') && String(req.headers['content-type'] ?? '').includes('json'),
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
  app.useGlobalFilters(new ProblemDetailsFilter(config.problemTypeBase, app.get(AppLogger)));
  app.useGlobalPipes(new StandardSchemaValidationPipe());
}
