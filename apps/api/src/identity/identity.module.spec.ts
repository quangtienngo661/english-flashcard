import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../test/support/test-config.js';
import { CommonModule } from '../common/common.module.js';
import { PRISMA_CLIENT, PrismaModule } from '../common/db/prisma.module.js';
import { IdentityModule } from './identity.module.js';
import { ROLE_PERMISSIONS, type Permission, type StaffRole } from './identity.types.js';
import { IdentityService } from './profile/identity.service.js';
import { ROLE_PERMISSIONS_TOKEN } from './staff/role-permissions.token.js';

@Injectable()
class ProfileConsumer {
  constructor(
    @Inject(IdentityService) readonly identity: IdentityService,
    @Inject(ROLE_PERMISSIONS_TOKEN) readonly rolePermissions: Record<StaffRole, readonly Permission[]>,
  ) {}
}
@Module({ imports: [IdentityModule], providers: [ProfileConsumer] })
class ConsumerModule {}

describe('IdentityModule exports', () => {
  it('B1#25/D3: another module can inject IdentityService and the default permission table', async () => {
    const userId = 'user';
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue({
      id: userId, email: 'a@example.com', emailVerifiedAt: null, nativeLanguage: null,
      timezone: 'Asia/Ho_Chi_Minh', staffRole: null,
    }) } };
    const moduleRef = await Test.createTestingModule({ imports: [CommonModule.forRoot(testConfig()),
      PrismaModule.forRoot({ connectionString: 'unused', ...testConfig().database }), ConsumerModule] })
      .overrideProvider(PRISMA_CLIENT).useValue(prisma).compile();
    try {
      const consumer = moduleRef.get(ProfileConsumer);
      expect(await consumer.identity.getProfile(userId)).toMatchObject({ id: userId, native_language: null });
      expect(await consumer.identity.isEmailVerified(userId)).toBe(false);
      expect(consumer.rolePermissions).toEqual(ROLE_PERMISSIONS);
      expect(Reflect.getMetadata('exports', IdentityModule)).toEqual([IdentityService, ROLE_PERMISSIONS_TOKEN]);
    } finally { await moduleRef.close(); }
  });
});
