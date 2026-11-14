import { Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Public } from '../../identity/sessions/public.decorator.js';
import { BillingAdapterRegistry } from './billing-adapter.registry.js';
import { BillingInbox } from './billing-inbox.service.js';

/**
 * `POST|GET /v1/billing/webhooks/{provider}` (design §9.2, R16): public, no rate limit; the signature is checked first on the
 * raw body (route-scoped raw parser in `app.setup.ts`). Logs carry the provider and counts only, never the body (SR10).
 */
@Public()
@Controller('billing/webhooks')
export class WebhookController {
  constructor(
    @Inject(BillingAdapterRegistry) private readonly registry: BillingAdapterRegistry,
    @Inject(BillingInbox) private readonly inbox: BillingInbox,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  @Post(':provider')
  post(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    return this.receive('POST', provider, req, res);
  }

  @Get(':provider')
  get(@Param('provider') provider: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    return this.receive('GET', provider, req, res);
  }

  private async receive(method: 'GET' | 'POST', provider: string, req: Request, res: Response): Promise<void> {
    const adapter = this.registry.get(provider);
    if (adapter === undefined) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const verified = await adapter.verify({
      method,
      headers: req.headers,
      query: req.query as Record<string, unknown>,
      rawBody: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
    });
    if (!verified.ok) {
      this.logger.warn('billing_signature_invalid', { provider });
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    if (verified.skipped > 0) this.logger.info('billing_event_skipped', { provider, skipped: verified.skipped });
    const ids = await this.inbox.store(provider, verified.events);
    const ack = adapter.ack({ received: verified.events.length });
    this.inbox.afterResponse(res, ids);
    if (ack.body === undefined) res.status(ack.status).end();
    else res.status(ack.status).json(ack.body);
  }
}
