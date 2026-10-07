import type { OtpPurpose } from '../identity.types.js';
import type { MailMessage } from './mailer.js';

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

export function otpLockedMail(to: string, purpose: OtpPurpose): MailMessage {
  const vi = purpose === 'verify_email' ? 'Xác minh email' : 'Đặt lại mật khẩu';
  const en = purpose === 'verify_email' ? 'Email verification' : 'Password reset';
  return {
    to,
    subject: 'Tạm khóa mã xác thực / Verification codes temporarily locked',
    text: `${vi} đã bị khóa trong 24 giờ do quá nhiều lần nhập mã sai. Đăng nhập bằng mật khẩu vẫn hoạt động.\n\n${en} has been locked for 24 hours after too many incorrect codes. Password login still works.`,
  };
}
