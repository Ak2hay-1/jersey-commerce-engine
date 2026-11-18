import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
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

  @Public()
  @SkipThrottle()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Disallow crawlers from indexing the API' })
  @ApiProduces('text/plain')
  @ApiOkResponse({ description: 'robots.txt body' })
  getRobots(): string {
    return 'User-agent: *\nDisallow: /\n';
  }
}
