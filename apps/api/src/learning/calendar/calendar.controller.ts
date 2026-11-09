import { Controller, Get, Inject, Query } from '@nestjs/common';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { type CalendarMonthQuery, calendarMonthQuery } from './calendar.schemas.js';
import { CalendarService } from './calendar.service.js';

@Controller('me/calendar')
@LearnerContent()
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendar: CalendarService) {}

  @Get()
  month(@CurrentLearner() learner: Learner, @Query({ schema: calendarMonthQuery }) query: CalendarMonthQuery) {
    return this.calendar.month(learner.userId, query.month);
  }
}
