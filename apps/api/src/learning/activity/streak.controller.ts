import { Controller, Get, Inject } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { localDate } from '../../common/time/local-date.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { LearningService } from '../learning.service.js';

/** The study streak for the "Lịch" button (design giao diện mới §10.5): today is the learner's local date. */
@Controller('me/streak')
@LearnerContent()
export class StreakController {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(LearningService) private readonly learning: LearningService,
  ) {}

  @Get()
  async streak(@CurrentLearner() learner: Learner): Promise<{ days: number; studied_today: boolean }> {
    const profile = await this.identity.getProfile(learner.userId);
    if (!profile) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const { days, studiedToday } = await this.learning.streakAsOf(
      learner.userId,
      localDate(profile.timezone, this.clock.now()),
    );
    return { days, studied_today: studiedToday };
  }
}
