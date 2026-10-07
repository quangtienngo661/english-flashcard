import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PasswordHasher } from './auth/password-hasher.service.js';
import { MailBudget } from './mailer/mail-budget.service.js';
import { MailDispatcher } from './mailer/mail-dispatcher.service.js';
import { Mailer } from './mailer/mailer.js';
import { SmtpMailer } from './mailer/smtp-mailer.js';
import { AccessTokenService } from './sessions/access-token.service.js';
import { AuthGuard } from './sessions/auth.guard.js';
import { SessionService } from './sessions/session.service.js';
import { SessionsController } from './sessions/sessions.controller.js';

@Module({
  controllers: [SessionsController],
  providers: [
    PasswordHasher, AccessTokenService, SessionService, { provide: APP_GUARD, useClass: AuthGuard },
    { provide: Mailer, useClass: SmtpMailer }, MailBudget, MailDispatcher,
  ],
})
export class IdentityModule {}
