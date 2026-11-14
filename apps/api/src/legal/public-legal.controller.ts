import { Controller, Get, Inject } from '@nestjs/common';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import { Public } from '../identity/sessions/public.decorator.js';
import { LegalService, type PublicLegal } from './legal.service.js';

/** The published Privacy Policy and Terms of Use, for the public pages of the web app. */
@Controller('legal')
export class PublicLegalController {
  constructor(@Inject(LegalService) private readonly legal: LegalService) {}

  @Get('current')
  @Public()
  async current(): Promise<PublicLegal> {
    const current = await this.legal.current();
    if (!current) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return current;
  }
}
