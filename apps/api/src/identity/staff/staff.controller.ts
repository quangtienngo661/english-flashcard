import { Body, Controller, Get, Inject, Param, Put, Query, Req } from '@nestjs/common';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from './require-permission.decorator.js';
import { findUserQuerySchema, listStaffQuerySchema, setStaffRoleSchema, staffUserParamsSchema,
  type FindUserQuery, type ListStaffQuery, type SetStaffRoleBody, type StaffUserParams } from './staff.schemas.js';
import { StaffService, staffUserNotFound, type StaffUserView } from './staff.service.js';

@Controller('admin')
@RequirePermission('roles.manage')
export class StaffController {
  constructor(@Inject(StaffService) private readonly staff: StaffService) {}

  @Get('users')
  async findUser(@Query({ schema: findUserQuerySchema }) query: FindUserQuery): Promise<StaffUserView> {
    const user = await this.staff.findByEmail(query.email);
    if (!user) throw staffUserNotFound();
    return user;
  }

  @Get('staff')
  listStaff(@Query({ schema: listStaffQuerySchema }) query: ListStaffQuery) {
    return this.staff.listStaff(query.page_size, query.page_token);
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
