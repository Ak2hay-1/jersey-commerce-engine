import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { AuthSessionService, requestMeta } from './auth-session.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthTokenResponseDto } from './dto/auth-response.dto';
import { LoginTenantsResponseDto } from './dto/login-tenants.dto';
import { REFRESH_COOKIE_NAME } from './auth.constants';
import { parseExpirationToMs } from '../common/time/expiration';

@ApiTags('auth')
@Controller('auth')
export class AuthSessionController {
  constructor(
    private readonly auth: AuthSessionService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  @Public()
  @Get('login-tenants')
  @ApiOperation({ summary: 'List active shops for the staff login picker' })
  @ApiOkResponse({ type: LoginTenantsResponseDto })
  listLoginTenants(@Req() request: Request) {
    return this.auth.listLoginTenants(requestMeta(request));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, requestMeta(request));
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and issue a new access/refresh token pair' })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  async refresh(@Body() dto: RefreshDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(dto, request, requestMeta(request));
    this.setRefreshCookie(response, result.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke the current refresh token and denylist the access token' })
  async logout(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.logout(user, dto, request, requestMeta(request));
    response.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    return result;
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return the authenticated user, tenant, roles, and permissions' })
  me(@CurrentUser() user: AuthPrincipal) {
    return this.auth.meFromDatabase(user);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  async changePassword(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.changePassword(user, dto, requestMeta(request));
    response.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    return result;
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: this.config.get('COOKIE_SAMESITE', { infer: true }),
      path: '/api/v1/auth',
      maxAge: parseExpirationToMs(this.config.get('JWT_REFRESH_EXPIRATION', { infer: true })),
    });
  }
}
