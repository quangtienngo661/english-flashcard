import { Injectable } from '@nestjs/common';
import type { JobHandler, JobQueueName } from './job-types.js';

/** Handlers register onModuleInit, before the runner's onApplicationBootstrap. */
@Injectable()
export class JobHandlerRegistry {
  private readonly handlers = new Map<JobQueueName, JobHandler>();

  register(handler: JobHandler): void {
    this.handlers.set(handler.queue, handler);
  }

  get(queue: JobQueueName): JobHandler | undefined {
    return this.handlers.get(queue);
  }

  queues(): JobQueueName[] {
    return [...this.handlers.keys()];
  }
}
