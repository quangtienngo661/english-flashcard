import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { APP_CONFIG, type AppConfig } from '../../../common/config/app-config.js';
import { ProblemDetailsException } from '../../../common/problem-details/problem-details.exception.js';
import { Public } from '../../../identity/sessions/public.decorator.js';
import { ORDER_CODE_MAX, ORDER_CODE_MIN, orderDescription } from '../../orders/order-codes.js';
import { FakePayosAdapter, type FakeLink } from './fake-payos.adapter.js';

const querySchema = z.object({
  order: z.string().regex(/^\d{1,15}$/).transform(Number).refine(Number.isSafeInteger),
  action: z.enum(['paid', 'short', 'cancel']).optional(),
  webhook: z.enum(['0', '1']).optional(),
});

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const dong = new Intl.NumberFormat('vi-VN');

/** Where payOS sends the browser back to: the order's own URL plus `code`, `id`, `cancel`, `status`, `orderCode` (design §3.1). */
function backTo(link: FakeLink, cancelled: boolean): string {
  const url = new URL(cancelled ? link.cancelUrl : link.returnUrl);
  url.searchParams.set('code', '00');
  url.searchParams.set('id', link.paymentLinkId);
  url.searchParams.set('cancel', String(cancelled));
  url.searchParams.set('status', link.status);
  url.searchParams.set('orderCode', String(link.orderCode));
  return url.toString();
}

function page(link: FakeLink): string {
  const code = link.orderCode;
  const paid = link.transactions.reduce((total, tx) => total + tx.amount, 0);
  const description = code >= ORDER_CODE_MIN && code <= ORDER_CODE_MAX ? orderDescription(code) : String(code);
  const base = `?order=${code}`;
  return `<!doctype html><meta charset="utf-8"><title>Fake payOS</title>
<h1>Fake payOS (tests and local runs only)</h1>
<p>Order <b>${escapeHtml(description)}</b> · ${dong.format(link.amount)} ₫ · status <b>${escapeHtml(link.status)}</b> · paid so far ${dong.format(paid)} ₫</p>
<p>Expires ${escapeHtml(link.expiresAt.toISOString())}. Returns to: ${escapeHtml(link.returnUrl)}</p>
<p><a href="${base}&amp;action=paid">Đã trả</a> · <a href="${base}&amp;action=short">Trả thiếu</a> · <a href="${base}&amp;action=cancel">Hủy</a></p>
<p>Without the webhook (it arrives late): <a href="${base}&amp;action=paid&amp;webhook=0">Đã trả</a> · <a href="${base}&amp;action=short&amp;webhook=0">Trả thiếu</a></p>`;
}

/**
 * The fake payOS payment page (launch prep B design §3.3), like the fake Google page: it exists only while `PAYOS_FAKE_ENABLED`;
 * every other mode answers 404, as if the route were absent. A person gets three links; tests call the same URL with `action`.
 */
@Controller('dev/payos')
export class FakePayosController {
  constructor(
    @Inject(FakePayosAdapter) private readonly adapter: FakePayosAdapter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('checkout')
  @Public()
  async checkout(@Query() rawQuery: Record<string, unknown>, @Res() res: Response): Promise<void> {
    if (this.config.payos.mode !== 'fake') throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    const { order, action, webhook } = parsed.data;
    let link = await this.adapter.link(order);
    if (link === null) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    if (action === 'cancel') {
      await this.adapter.cancelCheckout(order);
      link = (await this.adapter.link(order)) ?? link;
      res.redirect(302, backTo(link, true));
      return;
    }
    if (action !== undefined) {
      link = (await this.adapter.pay(order, action === 'paid' ? 'full' : 'short', { webhook: webhook !== '0' })) ?? link;
      // payOS sends the payer back after a complete payment; a half payment leaves them on the page.
      if (action === 'paid' && link.status === 'PAID') {
        res.redirect(302, backTo(link, false));
        return;
      }
    }
    res.status(200).type('html').send(page(link));
  }
}
