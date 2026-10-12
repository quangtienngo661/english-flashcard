import {
  Body, Controller, HttpCode, Inject, Post, Req, UploadedFile, UseFilters, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {} from 'multer';
import { z } from 'zod';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import type { RequestWithOperationId } from '../../common/logging/operation-id.middleware.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { MulterExceptionFilter } from './multer-exception.filter.js';
import { UploadsService } from './uploads.service.js';

const uploadSchema = z.strictObject({ level_source_id: z.uuid().optional() });

@Controller('admin/content/uploads')
@RequirePermission('content.import', 'content.edit')
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploads: UploadsService) {}

  @Post()
  @HttpCode(202)
  @RateLimit('user.write')
  @Idempotent({ timeoutSeconds: 60 })
  @UseInterceptors(FileInterceptor('file'), IdempotencyInterceptor)
  @UseFilters(MulterExceptionFilter)
  async create(
    @Body({ schema: uploadSchema }) body: z.infer<typeof uploadSchema>,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
    @Req() request: RequestWithOperationId,
  ): Promise<{ batch_id: string; status: 'queued' }> {
    const { batchId } = await this.uploads.accept(user, file, body.level_source_id, request.operationId);
    return { batch_id: batchId, status: 'queued' };
  }
}
