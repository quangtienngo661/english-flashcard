import { Controller, Delete, Get, HttpCode, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { UnknownFormsAdminService } from './unknown-forms-admin.service.js';

const params = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const listQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional(),
});

// Accepting a form is POST /v1/admin/content/word-forms; this list only reads and dismisses (design §10).
@Controller('admin/practice/unknown-forms')
@RequirePermission('content.edit')
export class AdminUnknownFormsController {
  constructor(@Inject(UnknownFormsAdminService) private readonly forms: UnknownFormsAdminService) {}

  @Get()
  list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>) {
    return this.forms.list({ pageSize: query.page_size, pageToken: query.page_token });
  }

  @Delete(':id')
  @HttpCode(204)
  @RateLimit('user.write')
  async dismiss(@Param({ schema: params }) path: z.infer<typeof params>): Promise<void> {
    await this.forms.dismiss(path.id);
  }
}
