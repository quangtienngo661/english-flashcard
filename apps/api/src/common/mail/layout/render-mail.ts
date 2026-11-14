// Pure renderer: a MailSpec becomes an HTML email (table layout, inline CSS, a dark-mode block) and its plain-text twin.
// Design docs/superpowers/specs/2026-11-14-email-giao-dien-design.md §2. No I/O, no images, no web fonts.
import type { Inline, MailBlock, MailFooter, MailSpec } from './blocks.js';
import { EMAIL_COLORS } from './colors.js';

const C = EMAIL_COLORS.light;
const D = EMAIL_COLORS.dark;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans',Helvetica,Arial,sans-serif";

const ACCOUNT_REASON = {
  vi: 'Bạn nhận thư này vì email này gắn với một tài khoản Wordmet.',
  en: 'You received this email because this address belongs to a Wordmet account.',
};

const esc = (value: string): string => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

// ---------- inline runs ----------

function inlineHtml(parts: Inline[]): string {
  return parts.map((part) => {
    if (typeof part === 'string') return esc(part);
    if ('bold' in part) return `<strong>${esc(part.bold)}</strong>`;
    return `<a class="wm-alink" href="${esc(part.href)}" style="color:${C.accent};text-decoration:underline;">${esc(part.link)}</a>`;
  }).join('');
}

function inlineText(parts: Inline[]): string {
  return parts.map((part) => {
    if (typeof part === 'string') return part;
    if ('bold' in part) return part.bold;
    // A mailto link whose label is the address itself reads as the address alone.
    return part.href === `mailto:${part.link}` ? part.link : `${part.link} (${part.href})`;
  }).join('');
}

// ---------- blocks ----------

function blockHtml(block: MailBlock, small: boolean): string {
  switch (block.kind) {
    case 'heading':
      return `<h1 class="wm-ink" style="margin:0 0 12px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${C.ink};">${esc(block.text)}</h1>`;
    case 'paragraph':
      return `<p class="${small ? 'wm-muted' : 'wm-ink'}" style="margin:0 0 14px;font-family:${FONT};font-size:${small ? 14 : 16}px;line-height:1.6;color:${small ? C.muted : C.ink};">${inlineHtml(block.parts)}</p>`;
    case 'muted':
      return `<p class="wm-muted" style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.muted};">${inlineHtml(block.parts)}</p>`;
    case 'note':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr><td class="wm-bg wm-ink" style="background:${C.bg};border-left:3px solid ${C.accent};border-radius:6px;padding:12px 14px;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.ink};">${inlineHtml(block.parts)}</td></tr></table>`;
    case 'chip':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr><td style="background:${C.mark};border-radius:999px;padding:4px 12px;font-family:${FONT};font-size:13px;font-weight:700;color:${C.markInk};">${esc(block.text)}</td></tr></table>`;
    case 'code':
      // One text node, spaced by CSS: copying it yields the digits only.
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px;"><tr><td class="wm-soft" align="center" style="background:${C.accentSoft};border-radius:10px;padding:18px 12px;"><div class="wm-ink" style="font-family:${FONT};font-size:36px;line-height:1.1;font-weight:700;letter-spacing:10px;padding-left:10px;color:${C.ink};font-variant-numeric:tabular-nums;">${esc(block.code)}</div></td></tr></table>`;
    case 'button':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;"><tr><td class="wm-btn" style="background:${C.accent};border-radius:8px;"><a class="wm-btn-a" href="${esc(block.href)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1;color:${C.onAccent};text-decoration:none;border-radius:8px;">${esc(block.label)}</a></td></tr></table>`;
    case 'rows':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px;border-collapse:collapse;">${block.rows.map((row, index) => {
        const border = index === 0 ? '0' : `1px solid ${C.line}`;
        return `<tr><td class="wm-muted wm-line" style="padding:10px 12px 10px 0;border-top:${border};font-family:${FONT};font-size:14px;color:${C.muted};vertical-align:top;width:42%;">${esc(row.label)}</td><td class="wm-ink wm-line" style="padding:10px 0;border-top:${border};font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};vertical-align:top;">${esc(row.value)}</td></tr>`;
      }).join('')}</table>`;
  }
}

function blockText(block: MailBlock): string {
  switch (block.kind) {
    case 'heading': return block.text;
    case 'paragraph':
    case 'muted':
    case 'note': return inlineText(block.parts);
    case 'chip': return block.text;
    case 'code': return block.code;
    case 'button': return `${block.label}: ${block.href}`;
    case 'rows': return block.rows.map((row) => `${row.textLabel ?? row.label}: ${row.value}`).join('\n');
  }
}

// ---------- footer ----------

const link = (href: string, label: string) => `<a class="wm-link" href="${esc(href)}" style="color:${C.muted};text-decoration:underline;">${esc(label)}</a>`;

function footerParts(spec: MailSpec): { html: string[]; text: string[] } {
  const { language: lang, appUrl } = spec;
  const footer: MailFooter = spec.footer;
  const html: string[] = [];
  const text: string[] = [];
  switch (footer.kind) {
    case 'account': {
      const both = spec.english !== undefined;
      html.push(both ? `${ACCOUNT_REASON.vi}<br>${ACCOUNT_REASON.en}` : ACCOUNT_REASON[lang]);
      text.push(...(both ? [ACCOUNT_REASON.vi, ACCOUNT_REASON.en] : [ACCOUNT_REASON[lang]]));
      break;
    }
    case 'reminder':
      html.push(lang === 'vi' ? `Không muốn nhận nhắc học? ${link(footer.settingsUrl, 'Tắt trong Cài đặt')}.` : `Don't want reminders? ${link(footer.settingsUrl, 'Turn them off in Settings')}.`);
      text.push(lang === 'vi' ? `Tắt nhắc học trong Cài đặt: ${footer.settingsUrl}` : `Turn reminders off in Settings: ${footer.settingsUrl}`);
      break;
    case 'billing':
      html.push(lang === 'vi' ? `Cần hỗ trợ về thanh toán? Viết cho ${link(`mailto:${footer.supportEmail}`, footer.supportEmail)}.` : `Questions about a payment? Write to ${link(`mailto:${footer.supportEmail}`, footer.supportEmail)}.`);
      text.push(lang === 'vi' ? `Hỗ trợ thanh toán: ${footer.supportEmail}` : `Payment questions: ${footer.supportEmail}`);
      break;
    case 'none':
      break;
  }
  const privacy = `${appUrl}/${lang}/privacy`;
  const terms = `${appUrl}/${lang}/terms`;
  const names = lang === 'vi' ? ['Chính sách bảo mật', 'Điều khoản sử dụng'] : ['Privacy policy', 'Terms of use'];
  html.push(`${link(privacy, names[0])} · ${link(terms, names[1])} · © 2026 Wordmet`);
  text.push(`${names[0]}: ${privacy}`, `${names[1]}: ${terms}`, '© 2026 Wordmet');
  return { html, text };
}

// ---------- document ----------

const DARK_CSS = `
      body, .wm-bg-outer { background:${D.bg} !important; }
      .wm-card { background:${D.surface} !important; border-color:${D.line} !important; }
      .wm-ink { color:${D.ink} !important; }
      .wm-muted { color:${D.muted} !important; }
      .wm-line { border-color:${D.line} !important; }
      .wm-soft { background:${D.accentSoft} !important; }
      .wm-bg { background:${D.bg} !important; border-left-color:${D.accent} !important; }
      .wm-btn { background:${D.accent} !important; }
      .wm-btn-a { color:${D.onAccent} !important; }
      .wm-link { color:${D.muted} !important; }
      .wm-alink { color:${D.accent} !important; }
      .wm-logo-dot { color:${D.accent} !important; }`;

export function renderMail(spec: MailSpec): { html: string; text: string } {
  const main = spec.blocks.map((block) => blockHtml(block, false)).join('');
  const english = spec.english === undefined ? '' : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 14px;"><tr><td class="wm-line" style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr></table><p class="wm-muted" style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:600;color:${C.muted};">English</p>${spec.english.map((block) => blockHtml(block, true)).join('')}`;
  const footer = footerParts(spec);

  const html = `<!doctype html>
<html lang="${spec.language}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Wordmet</title>
<style>
  body { margin:0; padding:0; }
  @media (max-width: 600px) { .wm-pad { padding:24px 20px !important; } .wm-outer { padding:16px 8px !important; } }
  @media (prefers-color-scheme: dark) {${DARK_CSS}
  }
</style>
</head>
<body class="wm-bg-outer" style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(spec.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" class="wm-bg-outer" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
<tr><td class="wm-outer" align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
    <tr><td style="padding:0 4px 16px;">
      <a href="${esc(spec.appUrl)}" style="text-decoration:none;"><span class="wm-ink" style="font-family:${FONT};font-size:24px;font-weight:800;letter-spacing:-0.5px;color:${C.ink};">wordmet<span class="wm-logo-dot" style="color:${C.accent};">.</span></span></a>
    </td></tr>
    <tr><td class="wm-card wm-pad" style="background:${C.surface};border:1px solid ${C.line};border-radius:14px;padding:32px;">
      ${main}${english}
    </td></tr>
    <tr><td style="padding:16px 4px 0;">${footer.html.map((line) => `<p class="wm-muted" style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">${line}</p>`).join('')}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const parts = [spec.blocks.map(blockText).join('\n\n')];
  if (spec.english !== undefined) parts.push(`---\n\n${spec.english.map(blockText).join('\n\n')}`);
  parts.push(`--\n${footer.text.join('\n')}`);
  return { html, text: `${parts.join('\n\n')}\n` };
}
