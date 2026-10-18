import { applyDecorators, createParamDecorator, type ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../identity/sessions/public.decorator.js';
import { LearnerContentGuard, type Learner, type RequestWithLearner } from './learner-content.guard.js';

export function LearnerContent() {
  return applyDecorators(SetMetadata(IS_PUBLIC_KEY, false), UseGuards(LearnerContentGuard));
}

export const CurrentLearner = createParamDecorator((_: unknown, context: ExecutionContext): Learner => {
  return context.switchToHttp().getRequest<RequestWithLearner>().learner!;
});
