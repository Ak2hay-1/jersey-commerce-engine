import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ApiSuccessInterceptor } from './interceptors/api-success.interceptor';
import { RequestContextInterceptor } from './context/request-context.interceptor';
import { TenantContextModule } from './context/tenant-context.module';

@Global()
@Module({
  imports: [TenantContextModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiSuccessInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class CoreModule {}
