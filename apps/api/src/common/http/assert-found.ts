import { NotFoundException } from '@nestjs/common';

export function assertFound<T>(value: T | null | undefined, message = 'Resource not found'): T {
  if (value == null) {
    throw new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message,
    });
  }
  return value;
}
