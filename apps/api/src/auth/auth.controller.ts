import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Authentication module status' })
  @ApiOkResponse({ description: 'Authentication is available' })
  getStatus() {
    return this.authService.getStatus();
  }
}
