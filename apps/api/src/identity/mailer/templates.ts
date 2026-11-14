// Account, security and admin emails. Each one is a bilingual HTML + text mail (Vietnamese first, English under a rule), because the
// address owner's language is not known yet (design docs/superpowers/specs/2026-11-14-email-giao-dien-design.md §2.4). The words are the
// ones approved in docs/mockups/2026-11-14-email/index.html. Links go to the `/vi` pages of the learner app.
import type { Inline, MailBlock, MailFooter } from '../../common/mail/layout/blocks.js';
import { renderMail } from '../../common/mail/layout/render-mail.js';
import type { MailMessage } from '../../common/mail/mailer.js';
import type { OtpPurpose } from '../identity.types.js';

const para = (...parts: Inline[]): MailBlock => ({ kind: 'paragraph', parts });
const muted = (...parts: Inline[]): MailBlock => ({ kind: 'muted', parts });
const note = (...parts: Inline[]): MailBlock => ({ kind: 'note', parts });
const heading = (text: string): MailBlock => ({ kind: 'heading', text });
const button = (label: string, href: string): MailBlock => ({ kind: 'button', label, href });

const loginUrl = (appUrl: string) => `${appUrl}/vi/app/login`;
const forgotUrl = (appUrl: string) => `${appUrl}/vi/app/forgot-password`;

function bilingual(args: {
  to: string; subject: string; preheader: string; blocks: MailBlock[]; english: MailBlock[]; appUrl: string; footer?: MailFooter;
}): MailMessage {
  const { html, text } = renderMail({
    language: 'vi', preheader: args.preheader, blocks: args.blocks, english: args.english, footer: args.footer ?? { kind: 'account' }, appUrl: args.appUrl,
  });
  return { to: args.to, subject: args.subject, text, html };
}

export function otpMail(to: string, purpose: OtpPurpose, code: string, appUrl: string): MailMessage {
  if (purpose === 'verify_email') {
    return bilingual({
      to, appUrl, subject: 'Mã xác minh Wordmet / Your Wordmet code', preheader: 'Mã có hiệu lực 10 phút.',
      blocks: [
        heading('Xác minh email'),
        para('Nhập mã này trong Wordmet để xác minh email.'),
        { kind: 'code', code },
        muted('Mã có hiệu lực 10 phút. Không phải bạn đăng ký thì bỏ qua thư này.'),
      ],
      english: [para('Enter this code in Wordmet to verify your email. It expires in 10 minutes. If you did not sign up, ignore this email.')],
    });
  }
  return bilingual({
    to, appUrl, subject: 'Mã đặt lại mật khẩu Wordmet / Your Wordmet reset code', preheader: 'Mã có hiệu lực 10 phút.',
    blocks: [
      heading('Đặt lại mật khẩu'),
      para('Nhập mã này để đặt mật khẩu mới.'),
      { kind: 'code', code },
      muted('Mã có hiệu lực 10 phút. Không phải bạn yêu cầu thì bỏ qua thư này, mật khẩu không đổi.'),
    ],
    english: [para('Enter this code to set a new password. It expires in 10 minutes. If you did not ask for it, ignore this email; your password stays the same.')],
  });
}

export function otpLockedMail(to: string, purpose: OtpPurpose, appUrl: string): MailMessage {
  const vi = purpose === 'verify_email' ? 'xác minh email' : 'đặt lại mật khẩu';
  const en = purpose === 'verify_email' ? 'email verification' : 'password reset';
  return bilingual({
    to, appUrl, subject: 'Tạm khóa nhập mã Wordmet / Wordmet codes locked', preheader: 'Bạn vẫn đăng nhập được bằng mật khẩu.',
    blocks: [
      heading('Tạm khóa nhập mã'),
      para('Bạn nhập sai mã quá nhiều lần. Wordmet khóa ', { bold: vi }, ' trong 24 giờ.'),
      para('Bạn vẫn đăng nhập được bằng mật khẩu.'),
    ],
    english: [para('Too many incorrect codes. Wordmet locked ', { bold: en }, ' for 24 hours. You can still sign in with your password.')],
  });
}

export function passwordChangedMail(to: string, appUrl: string): MailMessage {
  return bilingual({
    to, appUrl, subject: 'Mật khẩu Wordmet đã đổi / Your Wordmet password was changed', preheader: 'Không phải bạn đổi? Đặt lại mật khẩu ngay.',
    blocks: [
      heading('Mật khẩu đã đổi'),
      para('Mật khẩu tài khoản Wordmet của bạn vừa được đổi.'),
      note('Không phải bạn đổi? Đặt lại mật khẩu ngay để khóa người kia ra.'),
      button('Đặt lại mật khẩu', forgotUrl(appUrl)),
    ],
    english: [para('Your Wordmet password was just changed. Not you? Reset your password now.')],
  });
}

export function passwordResetMail(to: string, appUrl: string): MailMessage {
  return bilingual({
    to, appUrl, subject: 'Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset', preheader: 'Không phải bạn? Đặt lại mật khẩu ngay.',
    blocks: [
      heading('Mật khẩu đã đặt lại'),
      para('Mật khẩu tài khoản Wordmet của bạn vừa được đặt lại bằng mã gửi tới email này.'),
      note('Không phải bạn? Đặt lại mật khẩu ngay.'),
      button('Đặt lại mật khẩu', forgotUrl(appUrl)),
    ],
    english: [para('Your Wordmet password was just reset with a code sent to this email. Not you? Reset your password now.')],
  });
}

/** Review 07/11 F2: registration answers the same for a taken email; the owner of the account gets this instead of a code. */
export function accountExistsMail(to: string, learnerAppUrl: string): MailMessage {
  return bilingual({
    to, appUrl: learnerAppUrl, subject: 'Bạn đã có tài khoản Wordmet / You already have a Wordmet account', preheader: 'Đăng nhập, hoặc dùng Quên mật khẩu.',
    blocks: [
      heading('Bạn đã có tài khoản Wordmet'),
      para('Ai đó vừa đăng ký Wordmet bằng email này. Email này đã có tài khoản, nên Wordmet không tạo tài khoản mới.'),
      button('Đăng nhập', loginUrl(learnerAppUrl)),
      muted('Quên mật khẩu? Bấm Quên mật khẩu ở trang đăng nhập. Không phải bạn đăng ký thì bỏ qua thư này.'),
    ],
    english: [para('Someone just signed up for Wordmet with this email. It already has an account, so no new one was made. Sign in, or use Forgot password on the sign-in page. Not you? Ignore this email.')],
  });
}

/** IR22: sent when a Google account is linked to an existing account by its email address. */
export function googleLinkedMail(to: string, appUrl: string): MailMessage {
  return bilingual({
    to, appUrl, subject: 'Đã liên kết Google với Wordmet / Google linked to Wordmet', preheader: 'Từ nay bạn đăng nhập được bằng Google.',
    blocks: [
      heading('Đã liên kết Google'),
      para('Một tài khoản Google vừa được liên kết với tài khoản Wordmet này. Từ nay bạn đăng nhập được bằng Google.'),
      note('Không phải bạn? Đổi mật khẩu ngay.'),
      button('Đặt lại mật khẩu', forgotUrl(appUrl)),
    ],
    english: [para('A Google account was just linked to this Wordmet account. You can now sign in with Google. Not you? Change your password now.')],
  });
}

/** Bước 8 (D13, D15): sent once when an account has been deleted; says what is kept. No account is left, so no "why you got this" line. */
export function accountDeletedMail(to: string, retentionYears: number, appUrl: string): MailMessage {
  return bilingual({
    to, appUrl, footer: { kind: 'none' },
    subject: 'Tài khoản Wordmet đã xóa / Your Wordmet account was deleted', preheader: 'Cảm ơn bạn đã học cùng Wordmet.',
    blocks: [
      heading('Tài khoản đã xóa'),
      para('Tài khoản Wordmet của bạn đã được xóa.'),
      para(`Wordmet giữ hồ sơ thanh toán ${retentionYears} năm theo quy định, không kèm tên bạn.`),
      muted('Cảm ơn bạn đã học cùng Wordmet.'),
    ],
    english: [para(`Your Wordmet account has been deleted. Payment records are kept for ${retentionYears} years as the law requires, without your name. Thank you for learning with Wordmet.`)],
  });
}

const PASSWORD_ROW = { label: 'Mật khẩu tạm', textLabel: 'Mật khẩu tạm / Password' } as const;

/** AD18: a learner created by an admin; the link is the learner app. */
export function learnerAccountMail(to: string, password: string, learnerAppUrl: string, mustChange: boolean): MailMessage {
  return bilingual({
    to, appUrl: learnerAppUrl, subject: 'Tài khoản Wordmet của bạn / Your Wordmet account', preheader: 'Đăng nhập bằng mật khẩu tạm dưới đây.',
    blocks: [
      heading('Tài khoản Wordmet của bạn'),
      para('Quản trị viên vừa tạo cho bạn một tài khoản Wordmet.'),
      { kind: 'rows', rows: [{ label: 'Email', value: to }, { ...PASSWORD_ROW, value: password }] },
      button('Đăng nhập', loginUrl(learnerAppUrl)),
      ...(mustChange ? [muted('Lần đăng nhập đầu, Wordmet yêu cầu bạn đổi mật khẩu.')] : []),
    ],
    english: [para(`An administrator created a Wordmet account for you. Sign in with the email and temporary password above.${mustChange ? ' You will be asked to change the password the first time you sign in.' : ''}`)],
  });
}

export function staffAccountMail(to: string, password: string, adminAppUrl: string, mustChange: boolean, learnerAppUrl: string): MailMessage {
  return bilingual({
    to, appUrl: learnerAppUrl, subject: 'Tài khoản quản trị Wordmet / Your Wordmet admin account', preheader: 'Đăng nhập trang quản trị bằng mật khẩu tạm.',
    blocks: [
      heading('Tài khoản quản trị Wordmet'),
      para('Quản trị viên vừa tạo cho bạn một tài khoản ở trang quản trị Wordmet.'),
      { kind: 'rows', rows: [{ label: 'Email', value: to }, { ...PASSWORD_ROW, value: password }] },
      button('Mở trang quản trị', adminAppUrl),
      ...(mustChange ? [muted('Lần đăng nhập đầu, Wordmet yêu cầu bạn đổi mật khẩu.')] : []),
    ],
    english: [para(`An administrator created an account for you on the Wordmet admin site. Sign in with the email and temporary password above.${mustChange ? ' You will be asked to change the password the first time you sign in.' : ''}`)],
  });
}

/** AD18: an admin set a new password; every session was signed out. `signInUrl` is the learner app for a learner, the admin app for staff. */
export function adminPasswordResetMail(to: string, password: string, signInUrl: string, mustChange: boolean, learnerAppUrl: string): MailMessage {
  const buttonUrl = signInUrl === learnerAppUrl ? loginUrl(learnerAppUrl) : signInUrl;
  return bilingual({
    to, appUrl: learnerAppUrl, subject: 'Mật khẩu Wordmet đã đặt lại / Your Wordmet password was reset', preheader: 'Bạn đã bị đăng xuất khỏi mọi thiết bị.',
    blocks: [
      heading('Mật khẩu đã đặt lại'),
      para('Quản trị viên đã đặt lại mật khẩu của bạn và đăng xuất bạn khỏi mọi thiết bị.'),
      { kind: 'rows', rows: [{ label: 'Mật khẩu mới', textLabel: 'Mật khẩu mới / New password', value: password }] },
      button('Đăng nhập', buttonUrl),
      ...(mustChange ? [muted('Lần đăng nhập tới, Wordmet yêu cầu bạn đổi mật khẩu.')] : []),
    ],
    english: [para(`An administrator reset your password and signed you out everywhere. Sign in with the new password above.${mustChange ? ' You will be asked to change it the next time you sign in.' : ''}`)],
  });
}

/** AD18: sent to the old address when an admin changes a user's email. */
export function emailChangedNoticeMail(oldEmail: string, newEmail: string, learnerAppUrl: string, supportEmail: string): MailMessage {
  return bilingual({
    to: oldEmail, appUrl: learnerAppUrl, subject: 'Email đăng nhập Wordmet đã đổi / Your Wordmet email was changed', preheader: `Email đăng nhập mới: ${newEmail}.`,
    blocks: [
      heading('Email đăng nhập đã đổi'),
      para('Quản trị viên đã đổi email đăng nhập của tài khoản Wordmet này.'),
      { kind: 'rows', rows: [{ label: 'Email mới', textLabel: 'Email mới / New email', value: newEmail }] },
      note('Không phải bạn yêu cầu? Viết cho ', { link: supportEmail, href: `mailto:${supportEmail}` }, '.'),
    ],
    english: [para(`An administrator changed the sign-in email of this Wordmet account to the address above. Did not ask for this? Write to ${supportEmail}.`)],
  });
}

/** Review 07/11 F12: sent to the new address after an admin changed the email; the account is unverified until this address confirms. */
export function emailChangedConfirmMail(newEmail: string, learnerAppUrl: string): MailMessage {
  return bilingual({
    to: newEmail, appUrl: learnerAppUrl, subject: 'Xác nhận email Wordmet mới / Confirm your new Wordmet email', preheader: 'Đăng nhập rồi nhập mã gửi tới email này.',
    blocks: [
      heading('Xác nhận email mới'),
      para('Email đăng nhập Wordmet của bạn vừa được đổi sang địa chỉ này. Để dùng tiếp, đăng nhập bằng mật khẩu rồi nhập mã gửi tới email này.'),
      button('Đăng nhập', loginUrl(learnerAppUrl)),
      muted('Chỉ dùng Google, hoặc quên mật khẩu? Bấm Quên mật khẩu ở trang đăng nhập.'),
    ],
    english: [para('The sign-in email of your Wordmet account was changed to this address. To keep using Wordmet, sign in with your password, then enter the code sent here. Only use Google, or forgot your password? Use Forgot password on the sign-in page.')],
  });
}
