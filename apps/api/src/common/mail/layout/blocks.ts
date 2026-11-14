// What a Wordmet email is made of. One list of blocks renders both the HTML and the plain-text part (design §2.3), so the two never drift.
/** A run inside a paragraph: plain text, bold text or a link. Nothing is raw HTML; every string is escaped by `renderMail`. */
export type Inline = string | { bold: string } | { link: string; href: string };

export type MailBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; parts: Inline[] }
  | { kind: 'muted'; parts: Inline[] }
  | { kind: 'note'; parts: Inline[] }
  | { kind: 'code'; code: string }
  | { kind: 'button'; label: string; href: string }
  /** `textLabel` replaces `label` in the plain-text part, e.g. "Mật khẩu tạm / Password" for a bilingual mail. */
  | { kind: 'rows'; rows: Array<{ label: string; value: string; textLabel?: string }> }
  | { kind: 'chip'; text: string };

export type MailFooter =
  | { kind: 'account' }
  | { kind: 'reminder'; settingsUrl: string }
  | { kind: 'billing'; supportEmail: string }
  | { kind: 'none' };

export type MailSpec = {
  /** `<html lang>`, footer words and the `/vi` or `/en` of the policy links. A bilingual mail uses 'vi'. */
  language: 'vi' | 'en';
  /** Hidden line shown beside the subject in the inbox. Never carries a code. */
  preheader: string;
  blocks: MailBlock[];
  /** When present the mail is bilingual: a rule, the label "English" and these blocks in small muted type. */
  english?: MailBlock[];
  footer: MailFooter;
  /** The learner app origin, no trailing slash. */
  appUrl: string;
};
