import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { IdentityService, type Profile } from './identity.service.js';
import { updateProfileSchema, type UpdateProfileBody } from './profile.schemas.js';

/** The profile plus how the caller signed in (this session) and every way the account can (Bước 8, D5, D8). */
export type MeResponse = Profile & { auth_method: 'password' | 'google'; sign_in_methods: Array<'password' | 'google'> };

@Controller('me')
export class ProfileController {
  constructor(@Inject(IdentityService) private readonly identity: IdentityService) {}

  @Get()
  async getProfile(@Req() req: RequestWithUser): Promise<MeResponse> {
    return this.withSignIn(req, this.requireProfile(await this.identity.getProfile(req.user!.userId)));
  }

  @Patch()
  @RateLimit('user.write')
  async updateProfile(
    @Body({ schema: updateProfileSchema }) body: UpdateProfileBody,
    @Req() req: RequestWithUser,
  ): Promise<MeResponse> {
    return this.withSignIn(req, this.requireProfile(await this.identity.updateProfile(req.user!.userId, body)));
  }

  private async withSignIn(req: RequestWithUser, profile: Profile): Promise<MeResponse> {
    return {
      ...profile,
      auth_method: req.account?.authMethod ?? 'password',
      sign_in_methods: await this.identity.signInMethods(profile.id),
    };
  }

  private requireProfile(profile: Profile | null): Profile {
    if (!profile) {
      throw new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
    }
    return profile;
  }
}
