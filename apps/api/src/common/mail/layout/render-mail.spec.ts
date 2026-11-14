import { describe, expect, it } from 'vitest';
import type { MailSpec } from './blocks.js';
import { EMAIL_COLORS } from './colors.js';
import { renderMail } from './render-mail.js';

const APP = 'https://wordmet.test';
const base = (over: Partial<MailSpec> = {}): MailSpec => ({
  language: 'vi', preheader: 'Tóm tắt.', blocks: [{ kind: 'heading', text: 'Tiêu đề' }], footer: { kind: 'none' }, appUrl: APP, ...over,
});
const lines = (text: string) => text.split('\n');

describe('renderMail', () => {
  it('escapes every text it is given and keeps the characters in the text part', () => {
    const { html, text } = renderMail(base({ blocks: [
      { kind: 'paragraph', parts: ['a <b> & "c"'] },
      { kind: 'rows', rows: [{ label: 'Mật khẩu', value: 'Kp7#<wQ&' }] },
    ] }));
    expect(html).toContain('a &lt;b&gt; &amp; &quot;c&quot;');
    expect(html).toContain('Kp7#&lt;wQ&amp;');
    expect(html).not.toContain('<b>');
    expect(text).toContain('a <b> & "c"');
    expect(text).toContain('Mật khẩu: Kp7#<wQ&');
  });

  it('puts the code in one text node and on its own text line', () => {
    const { html, text } = renderMail(base({ blocks: [{ kind: 'code', code: '482915' }] }));
    expect(html).toMatch(/>482915</);
    expect(html).toContain('letter-spacing:10px');
    expect(lines(text)).toContain('482915');
  });

  it('renders a button as a table cell link and as a labelled url line', () => {
    const { html, text } = renderMail(base({ blocks: [{ kind: 'button', label: 'Đăng nhập', href: `${APP}/vi/app/login` }] }));
    expect(html).toContain(`href="${APP}/vi/app/login"`);
    expect(html).toMatch(/<td class="wm-btn"[^>]*>\s*<a /);
    expect(lines(text)).toContain(`Đăng nhập: ${APP}/vi/app/login`);
  });

  it('renders rows with the text label when one is given', () => {
    const { html, text } = renderMail(base({ blocks: [
      { kind: 'rows', rows: [{ label: 'Mật khẩu tạm', textLabel: 'Mật khẩu tạm / Password', value: 'Kp7' }, { label: 'Email', value: 'a@x.test' }] },
    ] }));
    expect(lines(text)).toContain('Mật khẩu tạm / Password: Kp7');
    expect(lines(text)).toContain('Email: a@x.test');
    expect(html).toContain('>Mật khẩu tạm<');
    expect(html).not.toContain('/ Password');
  });

  it('renders bold and link parts; a mailto link whose label is the address stays one word in the text part', () => {
    const { html, text } = renderMail(base({ blocks: [
      { kind: 'paragraph', parts: ['Dùng tới ', { bold: 'hết ngày 13/02/2027' }, '. Viết cho ', { link: 'support@wordmet.com', href: 'mailto:support@wordmet.com' },
        ' hoặc ', { link: 'trang Gói', href: `${APP}/vi/app/plans` }, '.'] },
    ] }));
    expect(html).toContain('<strong>hết ngày 13/02/2027</strong>');
    expect(html).toContain('href="mailto:support@wordmet.com"');
    expect(text).toContain('Dùng tới hết ngày 13/02/2027. Viết cho support@wordmet.com hoặc trang Gói (https://wordmet.test/vi/app/plans).');
  });

  it('adds the English part under a rule when english is given', () => {
    const { html, text } = renderMail(base({ english: [{ kind: 'paragraph', parts: ['Enter this code.'] }] }));
    expect(html).toContain('>English<');
    expect(html).toContain('Enter this code.');
    const t = lines(text);
    expect(t.indexOf('---')).toBeGreaterThan(0);
    expect(t.indexOf('Enter this code.')).toBeGreaterThan(t.indexOf('---'));
  });

  it('writes the footer of each kind', () => {
    const account = renderMail(base({ footer: { kind: 'account' }, english: [{ kind: 'paragraph', parts: ['x'] }] }));
    expect(account.html).toContain('Bạn nhận thư này vì email này gắn với một tài khoản Wordmet.');
    expect(account.html).toContain('You received this email because this address belongs to a Wordmet account.');
    const reminder = renderMail(base({ footer: { kind: 'reminder', settingsUrl: `${APP}/vi/app/settings` } }));
    expect(reminder.html).toContain(`href="${APP}/vi/app/settings"`);
    expect(reminder.text).toContain(`Tắt nhắc học trong Cài đặt: ${APP}/vi/app/settings`);
    const billing = renderMail(base({ footer: { kind: 'billing', supportEmail: 'support@x.test' } }));
    expect(billing.html).toContain('href="mailto:support@x.test"');
    expect(billing.text).toContain('support@x.test');
    const none = renderMail(base({ footer: { kind: 'none' } }));
    expect(none.html).not.toContain('Bạn nhận thư này');
    for (const out of [account, reminder, billing, none]) {
      expect(out.html).toContain(`href="${APP}/vi/privacy"`);
      expect(out.html).toContain(`href="${APP}/vi/terms"`);
      expect(out.html).toContain('© 2026 Wordmet');
    }
  });

  it('writes an English page for language en: lang, footer words and /en/ links', () => {
    const { html } = renderMail(base({ language: 'en', footer: { kind: 'reminder', settingsUrl: `${APP}/en/app/settings` } }));
    expect(html).toContain('<html lang="en"');
    expect(html).toContain(`href="${APP}/en/privacy"`);
    expect(html).toContain('Privacy policy');
    expect(html).toContain('Turn them off in Settings');
  });

  it('is a safe email document', () => {
    const { html } = renderMail(base({ blocks: [
      { kind: 'heading', text: 'T' }, { kind: 'code', code: '123456' }, { kind: 'chip', text: 'Chuỗi 12 ngày' }, { kind: 'note', parts: ['n'] },
      { kind: 'button', label: 'B', href: `${APP}/x` }, { kind: 'muted', parts: ['m'] },
    ] }));
    expect(html).not.toMatch(/<img|<script|@import|<link/i);
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('prefers-color-scheme: dark');
    expect(html).toContain('max-width:560px');
    expect(html).toContain('<html lang="vi"');
    const allowed = new Set([...Object.values(EMAIL_COLORS.light), ...Object.values(EMAIL_COLORS.dark)]);
    for (const hex of html.match(/#[0-9a-fA-F]{6}\b/g) ?? []) expect(allowed.has(hex.toLowerCase()), hex).toBe(true);
  });

  it('carries the preheader in a hidden div and never repeats the code there', () => {
    const { html } = renderMail(base({ preheader: 'Mã có hiệu lực 10 phút.', blocks: [{ kind: 'code', code: '482915' }] }));
    expect(html).toMatch(/display:none[^>]*>Mã có hiệu lực 10 phút\./);
    expect(html.split('482915')).toHaveLength(2);
  });
});
