import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ObjectStorage, type PutObjectInput, type StoredObject } from './storage.types';

@Injectable()
export class LocalObjectStorage extends ObjectStorage {
  constructor(
    readonly rootDir: string,
    private readonly publicPrefix: string,
  ) {
    super();
  }

  resolveAbsolute(storageKey: string): string {
    const relative = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!relative || relative.includes('..')) {
      throw new Error('Invalid storage key.');
    }
    const absolute = path.resolve(this.rootDir, ...relative.split('/'));
    const root = path.resolve(this.rootDir);
    if (!absolute.startsWith(root)) {
      throw new Error('Invalid storage key.');
    }
    return absolute;
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const storageKey = input.key.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolute = this.resolveAbsolute(storageKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, input.body);
    return {
      storageKey,
      url: `${this.publicPrefix}/${storageKey.split('/').map(encodeURIComponent).join('/')}`,
    };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveAbsolute(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
