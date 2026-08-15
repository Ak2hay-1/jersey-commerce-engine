import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { RequestContextInterceptor } from './request-context.interceptor';

@Global()
@Module({
  providers: [TenantContextService, RequestContextInterceptor],
  exports: [TenantContextService, RequestContextInterceptor],
})
export class TenantContextModule {}
