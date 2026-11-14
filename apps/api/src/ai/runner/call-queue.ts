// Provider calls running at once in this process (design §8.4, D17). FIFO; the limit is read again on every acquire and every
// release, so raising it starts waiters at once and lowering it never cuts a running call. Deadlines are `performance.now()` times.

import { Injectable } from '@nestjs/common';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';

type Waiter = { grant: (release: () => void) => void; timer: ReturnType<typeof setTimeout> };

/** `ai.max_concurrent_calls` of the most recent settings read by the runner; `AiModule`'s `CallQueue` reads it (design §8.4). */
@Injectable()
export class ConcurrencyLimit {
  value = SETTINGS_DEFAULTS.ai.maxConcurrentCalls;
}

export class CallQueue {
  private running = 0;
  private readonly waiters: Waiter[] = [];

  constructor(private readonly getLimit: () => number) {}

  /** A release function once a slot is free, or null when `deadlineAtMs` passes first (the waiter then never takes a slot). */
  acquire(deadlineAtMs: number): Promise<(() => void) | null> {
    const waitMs = deadlineAtMs - performance.now();
    if (waitMs <= 0) return Promise.resolve(null);
    return new Promise((resolve) => {
      const waiter: Waiter = {
        grant: resolve,
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          resolve(null);
        }, waitMs),
      };
      this.waiters.push(waiter);
      this.pump();
    });
  }

  inFlight(): number {
    return this.running;
  }

  private pump(): void {
    while (this.waiters.length > 0 && this.running < this.getLimit()) {
      const waiter = this.waiters.shift() as Waiter;
      clearTimeout(waiter.timer);
      this.running += 1;
      waiter.grant(this.releaser());
    }
  }

  private releaser(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.running -= 1;
      this.pump();
    };
  }
}
