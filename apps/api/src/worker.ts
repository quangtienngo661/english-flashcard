import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { loadConfig } from './common/config/app-config.js';
import { ReadinessService } from './health/readiness.service.js';
import { startWorkerHeartbeat } from './health/worker-heartbeat.js';

async function bootstrap(): Promise<void> {
  if (existsSync('.env')) {
    process.loadEnvFile();
  }
  const config = loadConfig(process.env);
  const app = await NestFactory.createApplicationContext(AppModule.forRoot({
    ...config, pipeline: { ...config.pipeline, runWorkers: true },
  }));
  const heartbeat = startWorkerHeartbeat(app.get(ReadinessService));
  const stopHeartbeat = () => { heartbeat.stop(); };
  process.once('SIGTERM', stopHeartbeat);
  process.once('SIGINT', stopHeartbeat);
  // Workers and the reconciler timer keep this process alive. SIGTERM/SIGINT invoke Nest's
  // module shutdown hooks, including closing workers, Redis connections and the timer.
  app.enableShutdownHooks();
}

await bootstrap();
