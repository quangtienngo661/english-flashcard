import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import {
  type CalendarDayParam,
  calendarDayParam,
  type CalendarDayQuery,
  calendarDayQuery,
  type CalendarMonthQuery,
  calendarMonthQuery,
} from './calendar.schemas.js';
import { CalendarService } from './calendar.service.js';

@Controller('me/calendar')
@LearnerContent()
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendar: CalendarService) {}

  @Get()
  month(@CurrentLearner() learner: Learner, @Query({ schema: calendarMonthQuery }) query: CalendarMonthQuery) {
    return this.calendar.month(learner.userId, query.month);
  }

  @Get('days/:date')
  day(
    @CurrentLearner() learner: Learner,
    @Param({ schema: calendarDayParam }) params: CalendarDayParam,
    @Query({ schema: calendarDayQuery }) query: CalendarDayQuery,
  ) {
    return this.calendar.day(learner, params.date, query);
  }
}
