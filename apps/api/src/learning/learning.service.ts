import { Inject, Injectable } from '@nestjs/common';
import type { LearnerDay } from './queue/queue.queries.js';
import { QueueService } from './queue/queue.service.js';

/** The façade other modules (Notifications) use. */
@Injectable()
export class LearningService {
  constructor(@Inject(QueueService) private readonly queue: QueueService) {}

  /** Learners (of the given ones) with at least one card left after today's caps; `today` is each one's local date. */
  cardsLeftToday(entries: LearnerDay[]): Promise<Set<string>> {
    return this.queue.cardsLeftToday(entries);
  }
}
