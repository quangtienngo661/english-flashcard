import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { IdentityService, type Profile } from './identity.service.js';
import { updateProfileSchema, type UpdateProfileBody } from './profile.schemas.js';

@Controller('me')
export class ProfileController {
  constructor(@Inject(IdentityService) private readonly identity: IdentityService) {}

  @Get()
  async getProfile(@Req() req: RequestWithUser): Promise<Profile> {
    return this.requireProfile(await this.identity.getProfile(req.user!.userId));
  }

  @Patch()
  @RateLimit('user.write')
  async updateProfile(
    @Body({ schema: updateProfileSchema }) body: UpdateProfileBody,
    @Req() req: RequestWithUser,
  ): Promise<Profile> {
    return this.requireProfile(await this.identity.updateProfile(req.user!.userId, body));
  }

  private requireProfile(profile: Profile | null): Profile {
    if (!profile) {
      throw new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
    }
    return profile;
  }
}
