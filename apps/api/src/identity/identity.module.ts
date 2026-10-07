import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { PasswordController } from './auth/password.controller.js';
import { PasswordService } from './auth/password.service.js';
import { PasswordHasher } from './auth/password-hasher.service.js';
import { OtpController } from './auth/otp.controller.js';
import { OtpService } from './auth/otp.service.js';
import { IdentityCleanupService } from './maintenance/identity-cleanup.service.js';
import { MailBudget } from './mailer/mail-budget.service.js';
import { MailDispatcher } from './mailer/mail-dispatcher.service.js';
import { Mailer } from './mailer/mailer.js';
import { SmtpMailer } from './mailer/smtp-mailer.js';
import { IdentityService } from './profile/identity.service.js';
import { ProfileController } from './profile/profile.controller.js';
import { AccessTokenService } from './sessions/access-token.service.js';
import { AuthGuard } from './sessions/auth.guard.js';
import { SessionService } from './sessions/session.service.js';
import { SessionsController } from './sessions/sessions.controller.js';
import { PermissionGuard } from './staff/permission.guard.js';
import { StaffController } from './staff/staff.controller.js';
import { StaffService } from './staff/staff.service.js';

@Module({
  controllers: [SessionsController, OtpController, AuthController, PasswordController, ProfileController, StaffController],
  providers: [
    PasswordHasher, OtpService, AuthService, PasswordService, IdentityService, AccessTokenService, SessionService, StaffService, PermissionGuard, { provide: APP_GUARD, useClass: AuthGuard },
    { provide: Mailer, useClass: SmtpMailer }, MailBudget, MailDispatcher, IdentityCleanupService,
  ],
  exports: [IdentityService],
})
export class IdentityModule {}
