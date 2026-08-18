import type { PermissionCode } from '@jersey-commerce/types';
import type { AuthPrincipal } from '../common/context/request-context';

export function can(actor: AuthPrincipal, code: PermissionCode): boolean {
  return actor.permissions.includes(code);
}

export function canAny(actor: AuthPrincipal, codes: PermissionCode[]): boolean {
  return codes.some((code) => actor.permissions.includes(code));
}
