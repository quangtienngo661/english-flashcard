import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Public } from '../sessions/public.decorator.js';
import { FakeGoogleClient } from './google-client.fake.js';
import { GoogleClient } from './google-client.js';

const flag = z.enum(['true', 'false']).transform((value) => value === 'true');
const querySchema = z.object({
  state: z.string().min(1).max(200), nonce: z.string().min(1).max(200), code_challenge: z.string().min(1).max(200),
  redirect_uri: z.url(),
  email: z.string().max(254).optional(), sub: z.string().min(1).max(255).optional(), name: z.string().max(200).optional(),
  given_name: z.string().max(100).optional(), family_name: z.string().max(100).optional(), picture: z.string().max(2000).optional(),
  email_verified: flag.optional(), login_hint: z.string().max(255).optional(),
});

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The fake "choose an account" page and code issuer (design §5.8). It exists only while `GOOGLE_FAKE_ENABLED`: every other mode
 * answers 404, as if the route were absent. Tests pass the account in the query; a person gets a small form.
 */
@Controller('dev/google')
export class FakeGoogleController {
  constructor(
    @Inject(GoogleClient) private readonly client: GoogleClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('authorize')
  @Public()
  authorize(@Query() rawQuery: Record<string, unknown>, @Res() res: Response): void {
    if (this.config.google.mode !== 'fake' || !(this.client instanceof FakeGoogleClient)) {
      throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    }
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    const q = parsed.data;
    if (q.redirect_uri !== this.config.google.redirectUri) {
      throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
    }
    if (!q.email || !q.sub) {
      const hidden = ['state', 'nonce', 'code_challenge', 'redirect_uri'].map((key) =>
        `<input type="hidden" name="${key}" value="${escapeHtml(String(rawQuery[key]))}">`).join('');
      res.status(200).type('html').send(`<!doctype html><meta charset="utf-8"><title>Fake Google</title>
<h1>Fake Google (tests only)</h1><form method="get" action="">${hidden}
<p><label>Email <input name="email" required></label></p><p><label>Subject (sub) <input name="sub" required></label></p>
<p><label>Name <input name="name"></label></p><p><label>Given name <input name="given_name"></label></p>
<p><label>Family name <input name="family_name"></label></p><button>Continue</button></form>`);
      return;
    }
    res.redirect(302, this.client.issueCode({
      account: { email: q.email, sub: q.sub, emailVerified: q.email_verified, name: q.name, givenName: q.given_name, familyName: q.family_name, picture: q.picture },
      state: q.state, nonce: q.nonce, codeChallenge: q.code_challenge, redirectUri: q.redirect_uri,
    }));
  }
}
