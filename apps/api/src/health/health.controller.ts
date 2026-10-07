import { Controller, Get } from '@nestjs/common';
import { Public } from '../identity/sessions/public.decorator.js';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
