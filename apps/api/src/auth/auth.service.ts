import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getStatus() {
    return {
      authentication: 'ready',
      scheduledPhase: 2,
      message: 'JWT authentication, refresh rotation, and RBAC are enabled.',
    };
  }
}
