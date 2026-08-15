import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { APP_PORTS } from '@jersey-commerce/config';
import { AppModule } from './app.module';
import { configureHttpApp } from './common/http/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  configureHttpApp(app, { withSwagger: true });

  const port = Number(process.env.PORT ?? APP_PORTS.api);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
  logger.log(`OpenAPI documentation available at http://localhost:${port}/docs`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to bootstrap API', error);
  process.exit(1);
});
