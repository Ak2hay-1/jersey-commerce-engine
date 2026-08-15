import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SERVICE_NAME } from '@jersey-commerce/config';
import { Public } from './common/decorators/public.decorator';

@Controller()
@ApiTags('meta')
export class AppController {
  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'API service metadata' })
  @ApiOkResponse({
    description: 'Service is running',
  })
  getMetadata(): { service: string; version: string } {
    return {
      service: SERVICE_NAME,
      version: '0.2.0',
    };
  }
}
