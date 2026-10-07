import { DynamicModule, Global, Module } from '@nestjs/common';
import { Clock, SystemClock } from './clock/clock.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';
import { AppLogger, LOG_SINK, type LogSink } from './logging/app-logger.js';
import { RateLimitGuard } from './rate-limit/rate-limit.guard.js';
import { RateLimiter } from './rate-limit/rate-limiter.service.js';

@Global()
@Module({})
export class CommonModule {
  static forRoot(config: AppConfig): DynamicModule {
    const sink: LogSink = {
      write: (entry) => { process.stdout.write(`${JSON.stringify(entry)}\n`); },
    };
    return {
      module: CommonModule,
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: Clock, useClass: SystemClock },
        { provide: LOG_SINK, useValue: sink },
        AppLogger,
        RateLimiter,
        RateLimitGuard,
      ],
      exports: [APP_CONFIG, Clock, LOG_SINK, AppLogger, RateLimiter, RateLimitGuard],
    };
  }
}
