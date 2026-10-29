import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccountDeletionController } from './deletion/account-deletion.controller.js';
import { AccountDeletionRequests } from './deletion/account-deletion-requests.service.js';
import { AccountDeletionService } from './deletion/account-deletion.service.js';
import { AccountDeletionRegistry } from './deletion/account-eraser.js';
import { DeletionJobs } from './deletion/deletion-jobs.service.js';
import { FakeGoogleController } from './google/fake-google.controller.js';
import { GoogleClient } from './google/google-client.js';
import { FakeGoogleClient } from './google/google-client.fake.js';
import { RealGoogleClient } from './google/google-client.real.js';
import { GoogleAuthController } from './google/google-auth.controller.js';
import { GoogleAuthService } from './google/google-auth.service.js';
import { APP_CONFIG, type AppConfig } from '../common/config/app-config.js';
import { MailModule } from '../common/mail/mail.module.js';
import { ROLE_PERMISSIONS } from './identity.types.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { PasswordController } from './auth/password.controller.js';
import { PasswordService } from './auth/password.service.js';
import { PasswordHasher } from './auth/password-hasher.service.js';
import { OtpController } from './auth/otp.controller.js';
import { OtpService } from './auth/otp.service.js';
import { IdentityCleanupService } from './maintenance/identity-cleanup.service.js';
import { IdentityService } from './profile/identity.service.js';
import { ProfileController } from './profile/profile.controller.js';
import { AccessTokenService } from './sessions/access-token.service.js';
import { AccountStatusReader, PrismaAccountStatusReader } from './sessions/account-status.reader.js';
import { AuthGuard } from './sessions/auth.guard.js';
import { SessionService } from './sessions/session.service.js';
import { SessionsController } from './sessions/sessions.controller.js';
import { PermissionGuard } from './staff/permission.guard.js';
import { ROLE_PERMISSIONS_TOKEN } from './staff/role-permissions.token.js';
import { StaffController } from './staff/staff.controller.js';
import { StaffService } from './staff/staff.service.js';

@Module({
  imports: [MailModule],
  controllers: [SessionsController, OtpController, AuthController, PasswordController, ProfileController, StaffController, AccountDeletionController, GoogleAuthController, FakeGoogleController],
  providers: [
    PasswordHasher, OtpService, AuthService, PasswordService, IdentityService, AccessTokenService, SessionService, StaffService, PermissionGuard,
    { provide: AccountStatusReader, useClass: PrismaAccountStatusReader }, { provide: APP_GUARD, useClass: AuthGuard },
    { provide: ROLE_PERMISSIONS_TOKEN, useValue: ROLE_PERMISSIONS },
    IdentityCleanupService, AccountDeletionRegistry, AccountDeletionService, AccountDeletionRequests, DeletionJobs, GoogleAuthService,
    // The fake only when GOOGLE_FAKE_ENABLED (mode 'fake'); in mode 'off' the real client is never called.
    { provide: GoogleClient, inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => (config.google.mode === 'fake' ? new FakeGoogleClient(config.google) : new RealGoogleClient(config.google)) },
  ],
  exports: [IdentityService, ROLE_PERMISSIONS_TOKEN, AccountDeletionRegistry],
})
export class IdentityModule {}
