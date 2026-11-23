import { NestFactory } from '@nestjs/core';
import type { Redis } from 'ioredis';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { loadConfig } from './common/config/app-config.js';
import { MaintenanceScheduler } from './common/maintenance/maintenance.scheduler.js';
import { WorkerLiveness } from './common/workers/worker-liveness.js';
import { READINESS_REDIS, ReadinessService } from './health/readiness.service.js';
import { startWorkerHeartbeat } from './health/worker-heartbeat.js';

async function bootstrap(): Promise<void> {
  if (existsSync('.env')) {
    process.loadEnvFile();
  }
  const config = loadConfig(process.env);
  const app = await NestFactory.createApplicationContext(AppModule.forRoot({
    ...config, pipeline: { ...config.pipeline, runWorkers: true },
  }));

  const redis = app.get<Redis>(READINESS_REDIS);
  const scheduler = app.get(MaintenanceScheduler);
  const lastRunKey = `${config.pipeline.queuePrefix}:maintenance:last_run_at`;
  scheduler.onRunFinished(async (at) => {
    await redis.set(lastRunKey, at.toISOString());
  });

  const heartbeat = startWorkerHeartbeat(app.get(ReadinessService), app.get(WorkerLiveness));
  const stopHeartbeat = () => { heartbeat.stop(); };
  process.once('SIGTERM', stopHeartbeat);
  process.once('SIGINT', stopHeartbeat);
  // Workers and the reconciler timer keep this process alive. SIGTERM/SIGINT invoke Nest's
  // module shutdown hooks, including closing workers, Redis connections and the timer.
  app.enableShutdownHooks();
}

await bootstrap();
