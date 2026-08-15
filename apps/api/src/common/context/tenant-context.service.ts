import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthPrincipal } from './request-context';
import { getRequestContext } from './request-context';

@Injectable()
export class TenantContextService {
  get currentUser(): AuthPrincipal {
    const principal = getRequestContext()?.principal;
    if (!principal) {
      throw new UnauthorizedException('Authentication required.');
    }
    return principal;
  }

  get currentTenantId(): string {
    return this.currentUser.tenantId;
  }

  get currentRoles() {
    return this.currentUser.roles;
  }

  get currentPermissions() {
    return this.currentUser.permissions;
  }
}
