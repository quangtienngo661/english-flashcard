import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/problem-details/problem-details.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
