import path from 'node:path';
import { Global, Module } from '@nestjs/common';
import { LocalObjectStorage } from './local-storage.service';
import { OBJECT_STORAGE } from './storage.types';
import { MediaController } from './media.controller';

export function defaultUploadRoot(): string {
  return process.env.MEDIA_LOCAL_ROOT?.trim() || path.join(process.cwd(), 'uploads');
}

@Global()
@Module({
  controllers: [MediaController],
  providers: [
    {
      provide: LocalObjectStorage,
      useFactory: () => new LocalObjectStorage(defaultUploadRoot(), '/api/v1/media'),
    },
    {
      provide: OBJECT_STORAGE,
      useExisting: LocalObjectStorage,
    },
  ],
  exports: [OBJECT_STORAGE, LocalObjectStorage],
})
export class StorageModule {}
