import { describe, expect, it } from 'vitest';
import { mailPreviewSamples } from './mail-preview-samples.js';
import { parseMailPreviewArgs, resolveMailPreviewTarget } from './mail-preview.js';

const BASE = {
  to: 'test@example.com',
  learnerAppUrl: 'https://wordmet.com',
  adminAppUrl: 'https://admin.wordmet.com',
  supportEmail: 'support@wordmet.com',
};

describe('mail-preview (D5)', () => {
  it('mailPreviewSamples defaults to 17 emails (backward compatible)', () => {
    const samples = mailPreviewSamples(BASE);
    expect(samples).toHaveLength(17);
    expect(samples.every((m) => m.to === 'test@example.com')).toBe(true);
  });

  it('mailPreviewSamples with allLocales=true generates all 21 emails covering VI and EN for every localized template', () => {
    const samples = mailPreviewSamples({ ...BASE, allLocales: true });
    expect(samples).toHaveLength(21);
    expect(samples.every((m) => m.to === 'test@example.com')).toBe(true);
  });

  it('refuses non-local SMTP_HOST when --allow-remote-to is absent', () => {
    const args = parseMailPreviewArgs([]);
    const res = resolveMailPreviewTarget('smtp.resend.com', args);
    expect(res.ok).toBe(false);
  });

  it('allows local SMTP_HOST without --allow-remote-to (Mailpit default)', () => {
    const args = parseMailPreviewArgs(['local@example.com']);
    const res = resolveMailPreviewTarget('localhost', args);
    expect(res).toEqual({ ok: true, to: 'local@example.com', remote: false });
  });

  it('allows non-local SMTP_HOST only when --allow-remote-to matches the exact target email', () => {
    const args = parseMailPreviewArgs(['--allow-remote-to', 'test@example.com', '--all-locales']);
    expect(args.allLocales).toBe(true);
    expect(resolveMailPreviewTarget('smtp.resend.com', args)).toEqual({
      ok: true, to: 'test@example.com', remote: true,
    });

    const mismatch = parseMailPreviewArgs(['other@example.com', '--allow-remote-to', 'test@example.com']);
    expect(resolveMailPreviewTarget('smtp.resend.com', mismatch).ok).toBe(false);
  });
});
