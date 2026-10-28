import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { answerDeletion } from '../deletion/account-deletion.controller.js';
import { AccountDeletionRequests } from '../deletion/account-deletion-requests.service.js';
import { AccountDeletionRegistry } from '../deletion/account-eraser.js';
import { adminDeleteUserSchema, type AdminDeleteUserBody } from '../deletion/delete.schemas.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from './require-permission.decorator.js';
import { adminUsersQuerySchema, createAccountSchema, listStaffQuerySchema, lockUserSchema, resetPasswordSchema, setStaffRoleSchema,
  staffUserParamsSchema, updateUserSchema, type AdminUsersQuery, type CreateAccountBody, type ListStaffQuery, type LockUserBody,
  type ResetPasswordBody, type SetStaffRoleBody, type StaffUserParams, type UpdateUserBody } from './staff.schemas.js';
import { StaffService, staffUserNotFound, type AdminUserDetail, type StaffUserView } from './staff.service.js';

@Controller('admin')
@RequirePermission('roles.manage')
export class StaffController {
  constructor(
    @Inject(StaffService) private readonly staff: StaffService,
    @Inject(AccountDeletionRequests) private readonly deletions: AccountDeletionRequests,
    @Inject(AccountDeletionRegistry) private readonly deletionPorts: AccountDeletionRegistry,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  // AD18: editors read users too; every write below stays roles.manage.
  @Get('users')
  @RequirePermission('users.read')
  async findUsers(@Query({ schema: adminUsersQuerySchema }) query: AdminUsersQuery) {
    if (query.email !== undefined) {
      const user = await this.staff.findByEmail(query.email);
      if (!user) throw staffUserNotFound();
      return user;
    }
    return this.staff.listUsers({ q: query.q, status: query.status, pageSize: query.page_size, pageToken: query.page_token });
  }

  @Get('users/:id')
  @RequirePermission('users.read')
  async getUser(@Param({ schema: staffUserParamsSchema }) params: StaffUserParams) {
    const detail = await this.staff.getUserDetail(params.id);
    // The delete dialog says "auto-renewing plans will be switched off" (design §10).
    return { ...detail, auto_renewing: await this.deletionPorts.precondition().renewing(this.prisma, params.id) };
  }

  @Get('staff')
  listStaff(@Query({ schema: listStaffQuerySchema }) query: ListStaffQuery) {
    return this.staff.listStaff(query.page_size, query.page_token);
  }

  @Post('users')
  @RateLimit('user.write')
  createAccount(
    @Body({ schema: createAccountSchema }) body: CreateAccountBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StaffUserView> {
    return this.staff.createAccount(req.user!.userId, body, res);
  }

  @Put('users/:id/staff-role')
  @RateLimit('user.write')
  setStaffRole(
    @Param({ schema: staffUserParamsSchema }) params: StaffUserParams,
    @Body({ schema: setStaffRoleSchema }) body: SetStaffRoleBody,
    @Req() req: RequestWithUser,
  ): Promise<StaffUserView> {
    return this.staff.setStaffRole(req.user!.userId, params.id, body.staff_role);
  }

  @Patch('users/:id')
  @RateLimit('user.write')
  updateUser(
    @Param({ schema: staffUserParamsSchema }) params: StaffUserParams,
    @Body({ schema: updateUserSchema }) body: UpdateUserBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminUserDetail> {
    return this.staff.updateUser(req.user!.userId, params.id, body, res);
  }

  @Post('users/:id/password')
  @HttpCode(200)
  @RateLimit('user.write')
  resetPassword(
    @Param({ schema: staffUserParamsSchema }) params: StaffUserParams,
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminUserDetail> {
    return this.staff.resetPassword(req.user!.userId, params.id, body, res);
  }

  @Post('users/:id/lock')
  @HttpCode(200)
  @RateLimit('user.write')
  lockUser(
    @Param({ schema: staffUserParamsSchema }) params: StaffUserParams,
    @Body({ schema: lockUserSchema }) body: LockUserBody,
    @Req() req: RequestWithUser,
  ): Promise<AdminUserDetail> {
    return this.staff.lockUser(req.user!.userId, params.id, body.reason);
  }

  /** Design §7.1, D17: 204 when gone, 202 `{ status: 'pending' }` when the account is left `deleting`. */
  @Post('users/:id/delete')
  @RateLimit('user.write')
  async deleteUser(
    @Param({ schema: staffUserParamsSchema }) params: StaffUserParams,
    @Body({ schema: adminDeleteUserSchema }) body: AdminDeleteUserBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return answerDeletion(res, await this.deletions.deleteByAdmin(req.user!.userId, params.id, body, res));
  }

  @Post('users/:id/unlock')
  @HttpCode(200)
  @RateLimit('user.write')
  unlockUser(
    @Param({ schema: staffUserParamsSchema }) params: StaffUserParams,
    @Req() req: RequestWithUser,
  ): Promise<AdminUserDetail> {
    return this.staff.unlockUser(req.user!.userId, params.id);
  }
}
