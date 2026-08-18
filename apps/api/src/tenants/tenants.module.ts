import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminTenantsService } from './admin-tenants.service';
import { BootstrapGuard } from './bootstrap.guard';

@Module({
  controllers: [TenantsController, AdminTenantsController],
  providers: [TenantsService, AdminTenantsService, BootstrapGuard],
  exports: [TenantsService, AdminTenantsService],
})
export class TenantsModule {}
