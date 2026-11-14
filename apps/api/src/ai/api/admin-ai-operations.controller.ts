import { Controller, Get, Inject } from '@nestjs/common';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { OperationSettingsService } from '../models/operation-settings.service.js';

/**
 * What each operation runs with (design §12.1 #7). It is read only: a model, effort or limit is changed by publishing a config
 * (`/v1/admin/ai/configs`), so `PUT /operations/:op` answers 404 (nhóm B design §6.6).
 */
@Controller('admin/ai/operations')
@RequirePermission('settings.manage')
export class AdminAiOperationsController {
  constructor(@Inject(OperationSettingsService) private readonly operations: OperationSettingsService) {}

  @Get()
  list() {
    return this.operations.list();
  }
}
