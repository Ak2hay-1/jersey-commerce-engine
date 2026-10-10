import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@jersey-commerce/types';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const ANY_PERMISSIONS_KEY = 'requiredAnyPermissions';

/** Caller must hold every listed permission. */
export const RequirePermissions = (
  ...permissions: PermissionCode[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);

/** Caller must hold at least one of the listed permissions. */
export const RequireAnyPermission = (
  ...permissions: PermissionCode[]
): MethodDecorator & ClassDecorator => SetMetadata(ANY_PERMISSIONS_KEY, permissions);
