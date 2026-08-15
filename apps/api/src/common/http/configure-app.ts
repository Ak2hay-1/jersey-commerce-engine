import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
import { ApiSuccessInterceptor } from '../interceptors/api-success.interceptor';

export interface ConfigureHttpAppOptions {
  withSwagger?: boolean;
}

export function configureHttpApp(app: INestApplication, options: ConfigureHttpAppOptions = {}): void {
  if (process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (isProduction && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set to explicit frontend domains in production.');
  }

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : !isProduction,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Tenant-Slug',
      'X-Bootstrap-Secret',
      'X-Cart-Token',
      'Idempotency-Key',
    ],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ApiSuccessInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (options.withSwagger !== false) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Jersey Commerce Engine API')
      .setDescription(
        'Multi-tenant commerce platform API. Staff routes require a Bearer access token. Storefront cart and checkout use X-Tenant-Slug. Tenant context never comes from a client-supplied tenant id.',
      )
      .setVersion('0.9.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /api/v1/auth/login',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }
}
