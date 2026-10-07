import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { loadConfig } from './common/config/app-config.js';

async function bootstrap() {
  if (existsSync('.env')) {
    process.loadEnvFile();
  }
  const config = loadConfig(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), { bodyParser: false });
  configureApp(app, config);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
