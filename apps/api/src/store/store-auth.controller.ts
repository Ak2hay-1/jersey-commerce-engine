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
import { StoreLoginDto, StoreOtpRequestDto, StoreOtpVerifyDto, StoreGoogleExchangeDto, StoreProfileUpdateDto, StoreRegisterDto } from './dto/store-auth.dto';
import { StoreOtpService } from './store-otp.service';
import { StoreGoogleAuthService } from './store-google-auth.service';

@Controller('store')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
export class StoreAuthController {
  constructor(
    private readonly auth: StoreAuthService,
    private readonly otp: StoreOtpService,
    private readonly google: StoreGoogleAuthService,
  ) {}

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

  @Post('auth/otp/request')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send an email or SMS one-time sign-in code' })
  requestOtp(@TenantId() tenantId: string, @Body() dto: StoreOtpRequestDto, @Req() request: Request) {
    return this.otp.request(tenantId, dto, requestMeta(request));
  }

  @Post('auth/otp/verify')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify an email or SMS one-time sign-in code' })
  verifyOtp(@TenantId() tenantId: string, @Body() dto: StoreOtpVerifyDto, @Req() request: Request) {
    return this.otp.verify(tenantId, dto, requestMeta(request));
  }

  @Get('auth/google/start')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start Google Sign-In and return the authorization URL' })
  startGoogle(@TenantId() tenantId: string, @Req() request: Request) {
    return this.google.start(tenantId, request);
  }

  @Post('auth/google/exchange')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a one-time Google ticket for a customer session' })
  exchangeGoogle(@TenantId() tenantId: string, @Body() dto: StoreGoogleExchangeDto, @Req() request: Request) {
    return this.google.exchange(tenantId, dto.ticket, requestMeta(request));
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
