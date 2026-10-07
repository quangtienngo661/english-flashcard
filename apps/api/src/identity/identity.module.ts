import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PasswordHasher } from './auth/password-hasher.service.js';
import { AccessTokenService } from './sessions/access-token.service.js';
import { AuthGuard } from './sessions/auth.guard.js';

@Module({
  providers: [PasswordHasher, AccessTokenService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class IdentityModule {}
