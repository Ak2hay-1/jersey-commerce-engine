export interface StoredObject {
  url: string;
  storageKey: string;
}

export interface PutObjectInput {
  tenantId: string;
  key: string;
  body: Buffer;
  contentType: string;
}

export abstract class ObjectStorage {
  abstract put(input: PutObjectInput): Promise<StoredObject>;
  abstract delete(storageKey: string): Promise<void>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
