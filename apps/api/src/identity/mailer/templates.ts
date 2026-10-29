import type { OtpPurpose } from '../identity.types.js';
import type { MailMessage } from '../../common/mail/mailer.js';

export function otpMail(to: string, purpose: OtpPurpose, code: string): MailMessage {
  return {
    to,
    subject: purpose === 'verify_email'
      ? 'Xác minh email / Verify your email'
      : 'Đặt lại mật khẩu / Reset your password',
    text: purpose === 'verify_email'
      ? `Mã xác minh email của bạn: ${code}. Mã có hiệu lực trong 10 phút.\n\nYour email verification code: ${code}. It expires in 10 minutes.`
      : `Mã đặt lại mật khẩu của bạn: ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua thư này.\n\nYour password reset code: ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  };
}

export function passwordChangedMail(to: string): MailMessage {
  return {
    to,
    subject: 'Mật khẩu đã được đổi / Password changed',
    text: 'Bạn đã đổi mật khẩu. Nếu bạn không thực hiện thao tác này, hãy đặt lại mật khẩu ngay.\n\nYour password was changed. If you did not make this change, reset your password immediately.',
  };
}

export function passwordResetMail(to: string): MailMessage {
  return {
    to,
    subject: 'Mật khẩu đã được đặt lại / Password reset',
    text: 'Mật khẩu của bạn đã được đặt lại. Nếu bạn không thực hiện thao tác này, hãy đặt lại mật khẩu ngay.\n\nYour password was reset. If you did not make this change, reset your password immediately.',
  };
}

export function staffAccountMail(to: string, password: string, adminAppUrl: string, mustChange: boolean): MailMessage {
  const viNote = mustChange ? '\nBạn sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.' : '';
  const enNote = mustChange ? '\nYou will be asked to change your password the first time you sign in.' : '';
  return {
    to,
    subject: 'Tài khoản quản trị Wordmet / Your Wordmet admin account',
    text: `Một tài khoản đã được tạo cho bạn.\nTrang đăng nhập: ${adminAppUrl}\nEmail: ${to}\nMật khẩu / Password: ${password}${viNote}\n\nAn account has been created for you.\nSign in at: ${adminAppUrl}\nEmail: ${to}\nPassword: ${password}${enNote}`,
  };
}

/** AD18: a learner created by an admin; the link is the learner app. */
export function learnerAccountMail(to: string, password: string, learnerAppUrl: string, mustChange: boolean): MailMessage {
  const viNote = mustChange ? '\nBạn sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.' : '';
  const enNote = mustChange ? '\nYou will be asked to change your password the first time you sign in.' : '';
  return {
    to,
    subject: 'Tài khoản Wordmet của bạn / Your Wordmet account',
    text: `Một tài khoản Wordmet đã được tạo cho bạn.\nTrang đăng nhập: ${learnerAppUrl}\nEmail: ${to}\nMật khẩu / Password: ${password}${viNote}\n\nA Wordmet account has been created for you.\nSign in at: ${learnerAppUrl}\nEmail: ${to}\nPassword: ${password}${enNote}`,
  };
}

/** AD18: an admin set a new password; every session was signed out. */
export function adminPasswordResetMail(to: string, password: string, appUrl: string, mustChange: boolean): MailMessage {
  const viNote = mustChange ? '\nBạn sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập tới.' : '';
  const enNote = mustChange ? '\nYou will be asked to change your password the next time you sign in.' : '';
  return {
    to,
    subject: 'Mật khẩu Wordmet đã được đặt lại / Your Wordmet password was reset',
    text: `Quản trị viên đã đặt lại mật khẩu của bạn và đăng xuất bạn khỏi mọi thiết bị.\nTrang đăng nhập: ${appUrl}\nMật khẩu mới / New password: ${password}${viNote}\n\nAn administrator reset your password and signed you out everywhere.\nSign in at: ${appUrl}\nNew password: ${password}${enNote}`,
  };
}

/** AD18: sent to the old address when an admin changes a user's email. */
export function emailChangedNoticeMail(oldEmail: string, newEmail: string): MailMessage {
  return {
    to: oldEmail,
    subject: 'Email tài khoản Wordmet đã đổi / Your Wordmet email was changed',
    text: `Quản trị viên đã đổi email đăng nhập của tài khoản Wordmet này thành ${newEmail}. Nếu bạn không yêu cầu, hãy liên hệ hỗ trợ.\n\nAn administrator changed the sign-in email of this Wordmet account to ${newEmail}. If you did not ask for this, contact support.`,
  };
}

export function otpLockedMail(to: string, purpose: OtpPurpose): MailMessage {
  const vi = purpose === 'verify_email' ? 'Xác minh email' : 'Đặt lại mật khẩu';
  const en = purpose === 'verify_email' ? 'Email verification' : 'Password reset';
  return {
    to,
    subject: 'Tạm khóa mã xác thực / Verification codes temporarily locked',
    text: `${vi} đã bị khóa trong 24 giờ do quá nhiều lần nhập mã sai. Đăng nhập bằng mật khẩu vẫn hoạt động.\n\n${en} has been locked for 24 hours after too many incorrect codes. Password login still works.`,
  };
}

/** Bước 8 (D13, D15): sent once when an account has been deleted; says what is kept. */
export function accountDeletedMail(to: string, retentionYears: number): MailMessage {
  return {
    to,
    subject: 'Tài khoản Wordmet đã được xóa / Your Wordmet account was deleted',
    text: `Tài khoản Wordmet của bạn đã được xóa. Hồ sơ thanh toán được giữ ${retentionYears} năm theo quy định, không kèm tên bạn.\n\nYour Wordmet account has been deleted. Payment records are kept for ${retentionYears} years as the law requires, without your name.`,
  };
}

/** IR22: sent when a Google account is linked to an existing account by its email address. */
export function googleLinkedMail(to: string): MailMessage {
  return {
    to,
    subject: 'Tài khoản Google đã được liên kết / A Google account was linked',
    text: 'Tài khoản Google đã được liên kết với tài khoản Wordmet của bạn. Không phải bạn? Đổi mật khẩu ngay.\n\nA Google account has been linked to your Wordmet account. Not you? Change your password now.',
  };
}
