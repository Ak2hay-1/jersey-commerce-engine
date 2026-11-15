import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators/public.decorator';

@Controller()
@ApiTags('meta')
export class AppController {
  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'API liveness metadata' })
  @ApiOkResponse({
    description: 'Service is running',
  })
  getMetadata(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
