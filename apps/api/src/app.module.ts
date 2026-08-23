import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { serverEnvSchema } from '@jersey-commerce/config';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { WebsiteModule } from './website/website.module';
import { StoreModule } from './store/store.module';
import { AuditModule } from './audit/audit.module';
import { BackupsModule } from './backups/backups.module';
import { Phase2Module } from './phase2/phase2.module';
import { StorageModule } from './storage/storage.module';
import { CoreModule } from './common/core.module';
import { PosModule } from './pos/pos.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomOrdersModule } from './custom-orders/custom-orders.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { AuthSettingsModule } from './auth-settings/auth-settings.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (config) => serverEnvSchema.parse(config),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' },
              },
        autoLogging: true,
        redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[REDACTED]' },
      },
    }),
    PrismaModule,
    RedisModule,
    RealtimeModule,
    CoreModule,
    Phase2Module,
    StorageModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProductsModule,
    CategoriesModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    OrdersModule,
    PaymentsModule,
    ExpensesModule,
    WebsiteModule,
    StoreModule,
    AuditModule,
    BackupsModule,
    PosModule,
    ReportsModule,
    DashboardModule,
    CustomOrdersModule,
    PromoCodesModule,
    AuthSettingsModule,
    PaymentSettingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
