import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sniffImageMime } from '../storage/image-validation';

export const CUSTOM_ORDER_FILE_MAX_BYTES = 8 * 1024 * 1024;
export const CUSTOM_ORDER_MAX_FILES = 5;

const PDF_SIGNATURE = Buffer.from('%PDF');
const EXECUTABLE_SIGNATURES: Buffer[] = [
  Buffer.from([0x4d, 0x5a]),
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
];

export const ALLOWED_CUSTOM_ORDER_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedCustomOrderMime = (typeof ALLOWED_CUSTOM_ORDER_MIME_TYPES)[number];

const EXTENSION_BY_MIME: Record<AllowedCustomOrderMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const MIME_BY_EXTENSION: Record<string, AllowedCustomOrderMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export interface UploadedCustomOrderFile {
  buffer: Buffer;
  size: number;
  originalname?: string;
  mimetype?: string;
}

export interface ValidatedCustomOrderFile {
  buffer: Buffer;
  mimeType: AllowedCustomOrderMime;
  extension: string;
  originalFilename: string;
  fileSize: number;
  storageName: string;
}

export function sanitizeOriginalFilename(raw: string | undefined): string {
  const base = (raw ?? 'upload').replace(/\\/g, '/').split('/').pop() ?? 'upload';
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').replace(/^\.+/, '').slice(0, 180);
  return cleaned || 'upload';
}

export function sniffCustomOrderMime(buffer: Buffer): AllowedCustomOrderMime | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_SIGNATURE)) {
    return 'application/pdf';
  }
  return sniffImageMime(buffer);
}

export function isExecutableBuffer(buffer: Buffer): boolean {
  return EXECUTABLE_SIGNATURES.some((signature) => buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature));
}

export function extensionFromFilename(filename: string): string | null {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function validateCustomOrderFile(file: UploadedCustomOrderFile): ValidatedCustomOrderFile {
  if (!file?.buffer?.length) {
    throw new BadRequestException('An uploaded file is required.');
  }
  if (file.size > CUSTOM_ORDER_FILE_MAX_BYTES) {
    throw new BadRequestException(`Design files must be ${CUSTOM_ORDER_FILE_MAX_BYTES / (1024 * 1024)}MB or smaller.`);
  }
  if (isExecutableBuffer(file.buffer)) {
    throw new BadRequestException('Executable files are not allowed.');
  }
  const sniffed = sniffCustomOrderMime(file.buffer);
  if (!sniffed || !ALLOWED_CUSTOM_ORDER_MIME_TYPES.includes(sniffed)) {
    throw new BadRequestException('Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.');
  }
  const originalFilename = sanitizeOriginalFilename(file.originalname);
  const extension = extensionFromFilename(originalFilename);
  if (extension) {
    const expectedMime = MIME_BY_EXTENSION[extension];
    if (!expectedMime || expectedMime !== sniffed) {
      throw new BadRequestException('File extension does not match the file contents.');
    }
  }
  const claimed = file.mimetype?.toLowerCase();
  if (claimed && claimed !== sniffed && !(claimed === 'image/jpg' && sniffed === 'image/jpeg')) {
    throw new BadRequestException('Declared MIME type does not match the file contents.');
  }
  const safeExtension = EXTENSION_BY_MIME[sniffed];
  return {
    buffer: file.buffer,
    mimeType: sniffed,
    extension: safeExtension,
    originalFilename,
    fileSize: file.size,
    storageName: `${randomUUID()}.${safeExtension}`,
  };
}

export function customOrderStorageKey(tenantId: string, customOrderId: string, storageName: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeOrder = customOrderId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeTenant || !safeOrder || storageName.includes('..') || storageName.includes('/') || storageName.includes('\\')) {
    throw new BadRequestException('Invalid storage path.');
  }
  return `${safeTenant}/custom-orders/${safeOrder}/${storageName}`;
}
