import { Module } from '@nestjs/common';
import { PasswordHasher } from './auth/password-hasher.service.js';

@Module({
  providers: [PasswordHasher],
})
export class IdentityModule {}
