import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { LocalObjectStorage } from './local-storage.service';

@Controller('media')
@ApiTags('media')
export class MediaController {
  constructor(private readonly storage: LocalObjectStorage) {}

  @Public()
  @Get('*path')
  @ApiOperation({ summary: 'Serve a stored catalog image by storage key' })
  async getFile(@Param('path') storagePath: string | string[], @Res({ passthrough: true }) response: Response) {
    const relative = (Array.isArray(storagePath) ? storagePath.join('/') : storagePath).replace(/\\/g, '/');
    let absolute: string;
    try {
      absolute = this.storage.resolveAbsolute(relative);
    } catch {
      throw new NotFoundException('File not found.');
    }
    try {
      await access(absolute);
    } catch {
      throw new NotFoundException('File not found.');
    }
    const lower = absolute.toLowerCase();
    const mime = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
          ? 'image/jpeg'
          : 'application/octet-stream';
    response.setHeader('Content-Type', mime);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    return new StreamableFile(createReadStream(absolute));
  }
}
