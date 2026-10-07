import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import type { Permission } from '../identity.types.js';
import { PermissionGuard, REQUIRED_PERMISSION_KEY } from './permission.guard.js';

export { REQUIRED_PERMISSION_KEY } from './permission.guard.js';

export function RequirePermission(permission: Permission) {
  return applyDecorators(SetMetadata(REQUIRED_PERMISSION_KEY, permission), UseGuards(PermissionGuard));
}
