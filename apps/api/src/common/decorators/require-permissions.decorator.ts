import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@jersey-commerce/types';

export const PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (
  ...permissions: PermissionCode[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
