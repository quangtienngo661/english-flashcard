import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { IdentityService } from '../../identity/profile/identity.service.js';

export type Learner = { userId: string; nativeLanguage: 'vi' | 'en' };
export interface RequestWithLearner extends RequestWithUser {
  learner?: Learner;
}

@Injectable()
export class LearnerContentGuard implements CanActivate {
  constructor(@Inject(IdentityService) private readonly identity: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithLearner>();
    // The global AuthGuard has already authenticated this request or returned 401.
    const userId = request.user!.userId;
    const profile = await this.identity.getProfile(userId);
    if (!profile?.native_language) {
      throw new ProblemDetailsException({ status: 403, title: 'Profile incomplete', type: 'profile-incomplete' });
    }
    request.learner = { userId, nativeLanguage: profile.native_language };
    return true;
  }
}
