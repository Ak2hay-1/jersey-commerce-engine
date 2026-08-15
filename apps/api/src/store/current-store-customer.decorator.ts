import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { StoreCustomer } from './customer-access.guard';

export const CurrentStoreCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StoreCustomer => {
    const request = context.switchToHttp().getRequest<{ storeCustomer?: StoreCustomer }>();
    if (!request.storeCustomer) {
      throw new UnauthorizedException('Customer authentication required.');
    }
    return request.storeCustomer;
  },
);
