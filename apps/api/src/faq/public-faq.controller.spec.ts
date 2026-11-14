import { describe, expect, it } from 'vitest';
import { RATE_LIMIT_KEY } from '../common/rate-limit/rate-limit.decorator.js';
import { IS_PUBLIC_KEY } from '../identity/sessions/public.decorator.js';
import type { FaqService } from './faq.service.js';
import { PublicFaqController } from './public-faq.controller.js';

describe('GET /v1/public/faq (giao diện mới §10.7)', () => {
  it('returns the published items as question and answer only, exactly', async () => {
    const service = { published: async () => [{ question: 'Q1?', answer: 'A1.' }, { question: 'Q2?', answer: 'A2.' }] };
    const controller = new PublicFaqController(service as unknown as FaqService);
    expect(await controller.faq()).toEqual({ items: [{ question: 'Q1?', answer: 'A1.' }, { question: 'Q2?', answer: 'A2.' }] });
  });

  it('returns { items: [] } when nothing is published', async () => {
    const controller = new PublicFaqController({ published: async () => [] } as unknown as FaqService);
    expect(await controller.faq()).toEqual({ items: [] });
  });

  it('is public and limited by IP with public.faq.ip', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicFaqController.prototype.faq)).toBe(true);
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, PublicFaqController.prototype.faq)).toEqual(['public.faq.ip']);
  });
});
