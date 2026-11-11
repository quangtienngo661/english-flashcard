import { Controller, Get, Inject } from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { Public } from '../identity/sessions/public.decorator.js';
import { FaqService, type PublicFaqItem } from './faq.service.js';

/** The published FAQ for the home page, read at web build time (giao diện mới §10.7). Public, limited per IP. */
@Controller('public/faq')
export class PublicFaqController {
  constructor(@Inject(FaqService) private readonly faqService: FaqService) {}

  @Get()
  @Public()
  @RateLimit('public.faq.ip')
  async faq(): Promise<{ items: PublicFaqItem[] }> {
    return { items: await this.faqService.published() };
  }
}
