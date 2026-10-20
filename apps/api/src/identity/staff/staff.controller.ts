import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from './require-permission.decorator.js';
import { adminUsersQuerySchema, createAccountSchema, listStaffQuerySchema, setStaffRoleSchema, staffUserParamsSchema,
  type AdminUsersQuery, type CreateAccountBody, type ListStaffQuery, type SetStaffRoleBody, type StaffUserParams } from './staff.schemas.js';
import { StaffService, staffUserNotFound, type StaffUserView } from './staff.service.js';

@Controller('admin')
@RequirePermission('roles.manage')
export class StaffController {
  constructor(@Inject(StaffService) private readonly staff: StaffService) {}

  @Get('users')
  async findUsers(@Query({ schema: adminUsersQuerySchema }) query: AdminUsersQuery) {
    if (query.email !== undefined) {
      const user = await this.staff.findByEmail(query.email);
      if (!user) throw staffUserNotFound();
      return user;
    }
    return this.staff.listUsers({ q: query.q, status: query.status, pageSize: query.page_size, pageToken: query.page_token });
  }

  @Get('users/:id')
  getUser(@Param({ schema: staffUserParamsSchema }) params: StaffUserParams) {
    return this.staff.getUserDetail(params.id);
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
}
