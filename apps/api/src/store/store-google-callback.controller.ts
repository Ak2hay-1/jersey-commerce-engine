import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { StoreGoogleAuthService } from './store-google-auth.service';

@Controller('store/auth/google')
@ApiTags('store')
@Public()
export class StoreGoogleCallbackController {
  constructor(private readonly google: StoreGoogleAuthService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth callback. Redirects to the storefront with a one-time ticket.' })
  async callback(
    @Req() request: Request,
    @Res() response: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    const url = await this.google.callback(request, code, state);
    return response.redirect(url);
  }
}
