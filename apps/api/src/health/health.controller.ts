import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../identity/sessions/public.decorator.js';
import { ReadinessService, type ReadinessChecks } from './readiness.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  /** Liveness: the process answers. */
  @Get()
  @Public()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness: Postgres and Redis both answer within 2 s. 200 or 503 with a plain JSON body (not Problem Details), read the same way by
   * `curl -f`, the compose healthcheck and `deploy.sh`.
   */
  @Get('ready')
  @Public()
  async ready(@Res({ passthrough: true }) response: Response): Promise<{ status: 'ok' | 'unavailable'; checks: ReadinessChecks }> {
    const checks = await this.readiness.check();
    const ok = checks.database === 'ok' && checks.redis === 'ok';
    response.status(ok ? 200 : 503);
    return { status: ok ? 'ok' : 'unavailable', checks };
  }
}
