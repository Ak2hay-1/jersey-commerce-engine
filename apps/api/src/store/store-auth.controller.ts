import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { requestMeta } from '../auth/auth-session.service';
import { StoreTenantGuard } from './store-tenant.guard';
import { CustomerAccessGuard } from './customer-access.guard';
import { CurrentStoreCustomer } from './current-store-customer.decorator';
import type { StoreCustomer } from './customer-access.guard';
import { StoreAuthService } from './store-auth.service';
import { StoreLoginDto, StoreProfileUpdateDto, StoreRegisterDto } from './dto/store-auth.dto';

@Controller('store')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
export class StoreAuthController {
  constructor(private readonly auth: StoreAuthService) {}

  @Post('auth/register')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a customer account for the current store' })
  register(@TenantId() tenantId: string, @Body() dto: StoreRegisterDto, @Req() request: Request) {
    return this.auth.register(tenantId, dto, requestMeta(request));
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in a customer with email/phone and password' })
  login(@TenantId() tenantId: string, @Body() dto: StoreLoginDto, @Req() request: Request) {
    return this.auth.login(tenantId, dto, requestMeta(request));
  }

  @Post('auth/logout')
  @ApiOperation({ summary: 'Client-side logout acknowledgement. Customer JWTs expire naturally.' })
  logout() {
    return { loggedOut: true };
  }

  @Get('account/me')
  @UseGuards(CustomerAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the authenticated customer profile' })
  me(@TenantId() tenantId: string, @CurrentStoreCustomer() customer: StoreCustomer) {
    return this.auth.me(tenantId, customer.customerId);
  }

  @Patch('account/profile')
  @UseGuards(CustomerAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the authenticated customer profile' })
  update(
    @TenantId() tenantId: string,
    @CurrentStoreCustomer() customer: StoreCustomer,
    @Body() dto: StoreProfileUpdateDto,
  ) {
    return this.auth.updateProfile(tenantId, customer.customerId, dto);
  }
}
