import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthPrincipal, RequestContextStore } from './request-context';
import { requestContextStorage } from './request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthPrincipal; tenantId?: string }>();
    const user = request.user;
    const store: RequestContextStore = user
      ? {
          tenantId: user.tenantId,
          userId: user.userId,
          principal: user,
          bypassTenantScope: false,
        }
      : request.tenantId
        ? { tenantId: request.tenantId, bypassTenantScope: false }
        : { bypassTenantScope: true };

    return new Observable((subscriber) => {
      const subscription = requestContextStorage.run(store, () =>
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error: unknown) => subscriber.error(error),
          complete: () => subscriber.complete(),
        }),
      );
      return () => subscription.unsubscribe();
    });
  }
}
