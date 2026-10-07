import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { finalize, type Observable } from 'rxjs';

// Test-only: counts handlers that are still running so TestApp.close() can wait for them.
// Closing the HTTP server ends sockets, not handlers; a handler awaiting a transaction can still
// register mail (or touch the DB) after its socket is gone.
export class InFlightInterceptor implements NestInterceptor {
  private active = 0;
  private waiters: Array<() => void> = [];

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    this.active += 1;
    return next.handle().pipe(finalize(() => {
      this.active -= 1;
      if (this.active === 0) {
        for (const wake of this.waiters.splice(0)) wake();
      }
    }));
  }

  idle(): Promise<void> {
    if (this.active === 0) return Promise.resolve();
    return new Promise((resolve) => { this.waiters.push(resolve); });
  }
}
